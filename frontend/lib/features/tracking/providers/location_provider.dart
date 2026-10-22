import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sockets/socket_service.dart';
import '../models/location_model.dart';

enum TrackingStatus {
  idle,
  streaming,
  searchingSignal,
  offline,
  permissionDenied,
}

class LocationTrackerState {
  final bool isStreaming;
  final TrackingStatus status;
  final String? activeTripId;
  final LocationPointModel? lastPoint;
  final List<LocationPointModel> offlineBuffer;
  final TripLocationStatsModel? stats;
  final String? errorMessage;

  LocationTrackerState({
    this.isStreaming = false,
    this.status = TrackingStatus.idle,
    this.activeTripId,
    this.lastPoint,
    this.offlineBuffer = const [],
    this.stats,
    this.errorMessage,
  });

  LocationTrackerState copyWith({
    bool? isStreaming,
    TrackingStatus? status,
    String? activeTripId,
    LocationPointModel? lastPoint,
    List<LocationPointModel>? offlineBuffer,
    TripLocationStatsModel? stats,
    String? errorMessage,
  }) {
    return LocationTrackerState(
      isStreaming: isStreaming ?? this.isStreaming,
      status: status ?? this.status,
      activeTripId: activeTripId ?? this.activeTripId,
      lastPoint: lastPoint ?? this.lastPoint,
      offlineBuffer: offlineBuffer ?? this.offlineBuffer,
      stats: stats ?? this.stats,
      errorMessage: errorMessage,
    );
  }
}

class LocationTrackerNotifier extends StateNotifier<LocationTrackerState> {
  final Dio _dio;
  final SocketService _socketService;
  StreamSubscription<Position>? _positionSubscription;
  DateTime? _lastEmitTime;
  Position? _lastPosition;

  // Throttling configuration
  static const double minDistanceThresholdMeters = 10.0;
  static const Duration minTimeInterval = Duration(seconds: 10);

  LocationTrackerNotifier(this._dio, this._socketService)
      : super(LocationTrackerState());

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 -
        math.cos((lat2 - lat1) * p) / 2 +
        math.cos(lat1 * p) *
            math.cos(lat2 * p) *
            (1 - math.cos((lon2 - lon1) * p)) /
            2;
    return 12742 * math.asin(math.sqrt(a)) * 1000; // Returns meters
  }

  Future<bool> startTracking(String tripId) async {
    try {
      state = state.copyWith(status: TrackingStatus.searchingSignal, activeTripId: tripId);

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        state = state.copyWith(
          isStreaming: false,
          status: TrackingStatus.offline,
          errorMessage: 'GPS / Layanan lokasi dinonaktifkan di perangkat Anda.',
        );
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          state = state.copyWith(
            isStreaming: false,
            status: TrackingStatus.permissionDenied,
            errorMessage: 'Izin akses lokasi GPS ditolak.',
          );
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        state = state.copyWith(
          isStreaming: false,
          status: TrackingStatus.permissionDenied,
          errorMessage: 'Izin akses lokasi ditolak secara permanen. Mohon aktifkan di Pengaturan.',
        );
        return false;
      }

      // Connect socket if not connected
      await _socketService.connect();
      _socketService.joinTripMonitoring(tripId);

      LocationSettings locationSettings;
      if (Platform.isAndroid) {
        locationSettings = AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
          intervalDuration: const Duration(seconds: 5),
          forceLocationManager: false,
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: '📍 Tracking GPS TripEx Aktif',
            notificationText: 'Pelacakan rute perjalanan dinas sedang berjalan di latar belakang.',
            notificationIcon: AndroidResource(name: 'ic_launcher', defType: 'mipmap'),
            enableWakeLock: true,
          ),
        );
      } else if (Platform.isIOS) {
        locationSettings = AppleSettings(
          accuracy: LocationAccuracy.high,
          activityType: ActivityType.fitness,
          distanceFilter: 5,
          pauseLocationUpdatesAutomatically: false,
          allowBackgroundLocationUpdates: true,
        );
      } else {
        locationSettings = const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
        );
      }

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position position) => _onPositionUpdate(tripId, position),
        onError: (error) {
          state = state.copyWith(
            status: TrackingStatus.offline,
            errorMessage: 'Gagal membaca sinyal GPS: $error',
          );
        },
      );

      state = state.copyWith(
        isStreaming: true,
        status: TrackingStatus.streaming,
        activeTripId: tripId,
        errorMessage: null,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isStreaming: false,
        status: TrackingStatus.offline,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  void _onPositionUpdate(String tripId, Position position) {
    final now = DateTime.now();

    // Throttling Check: distance >= 10m OR interval >= 10s
    if (_lastPosition != null && _lastEmitTime != null) {
      final distance = _calculateDistance(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        position.latitude,
        position.longitude,
      );
      final elapsed = now.difference(_lastEmitTime!);

      if (distance < minDistanceThresholdMeters && elapsed < minTimeInterval) {
        // Skip emitting to prevent high-frequency battery drain
        return;
      }
    }

    _lastPosition = position;
    _lastEmitTime = now;

    final point = LocationPointModel(
      tripId: tripId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      speed: position.speed,
      heading: position.heading,
      recordedAt: now,
    );

    state = state.copyWith(
      lastPoint: point,
      status: TrackingStatus.streaming,
    );

    // Emit via Socket.io
    if (_socketService.isConnected) {
      _socketService.emitLocationUpdate(
        tripId: tripId,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speed,
        accuracy: position.accuracy,
        heading: position.heading,
        recordedAt: now,
      );

      // If we have buffered points from offline period, flush them
      if (state.offlineBuffer.isNotEmpty) {
        flushOfflineBuffer(tripId);
      }
    } else {
      // Buffer point offline
      final updatedBuffer = List<LocationPointModel>.from(state.offlineBuffer)..add(point);
      state = state.copyWith(
        offlineBuffer: updatedBuffer,
        status: TrackingStatus.offline,
      );
    }
  }

  Future<void> flushOfflineBuffer(String tripId) async {
    if (state.offlineBuffer.isEmpty) return;

    final batch = List<LocationPointModel>.from(state.offlineBuffer);
    try {
      final payload = {
        'trip_id': tripId,
        'locations': batch.map((p) => p.toJson()).toList(),
      };

      await _dio.post(ApiEndpoints.batchLocations, data: payload);
      state = state.copyWith(
        offlineBuffer: [],
        status: TrackingStatus.streaming,
      );
    } catch (_) {
      // Keep buffer to retry next time
    }
  }

  Future<void> stopTracking() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    _lastPosition = null;
    _lastEmitTime = null;

    if (state.activeTripId != null) {
      _socketService.leaveTripMonitoring(state.activeTripId!);
      // Flush any remaining offline buffer
      await flushOfflineBuffer(state.activeTripId!);
    }

    state = state.copyWith(
      isStreaming: false,
      status: TrackingStatus.idle,
      activeTripId: null,
    );
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }
}

// Riverpod Providers
final locationTrackerProvider =
    StateNotifierProvider<LocationTrackerNotifier, LocationTrackerState>((ref) {
  final dio = ApiClient().dio;
  final socketService = SocketService();
  return LocationTrackerNotifier(dio, socketService);
});

final tripLocationHistoryProvider =
    FutureProvider.family<TripLocationHistoryModel, String>((ref, tripId) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.tripLocations(tripId));
  final data = response.data['data'] as Map<String, dynamic>;
  return TripLocationHistoryModel.fromJson(data);
});

final tripLatestLocationProvider =
    FutureProvider.family<LocationPointModel?, String>((ref, tripId) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.tripLocationLatest(tripId));
  final data = response.data['data'];
  if (data == null) return null;
  return LocationPointModel.fromJson(data as Map<String, dynamic>);
});

final tripLocationStatsProvider =
    FutureProvider.family<TripLocationStatsModel, String>((ref, tripId) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.tripLocationStats(tripId));
  final data = response.data['data'] as Map<String, dynamic>;
  return TripLocationStatsModel.fromJson(data);
});
