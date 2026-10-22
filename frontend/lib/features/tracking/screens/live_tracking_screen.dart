import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/sockets/socket_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/location_model.dart';
import '../providers/location_provider.dart';
import '../../expenses/providers/expense_provider.dart';

class LiveTrackingScreen extends ConsumerStatefulWidget {
  final String tripId;
  final String? tripTitle;
  final String? destination;

  const LiveTrackingScreen({
    super.key,
    required this.tripId,
    this.tripTitle,
    this.destination,
  });

  @override
  ConsumerState<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends ConsumerState<LiveTrackingScreen> {
  GoogleMapController? _mapController;
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  final List<LatLng> _routePoints = [];

  StreamSubscription<Map<String, dynamic>>? _socketSubscription;
  LocationPointModel? _latestPosition;
  double _currentSpeedKmh = 0.0;
  double _totalDistanceKm = 0.0;
  bool _isLoadingHistory = true;
  bool _hasLocationPermission = false;

  static const LatLng _defaultPosition = LatLng(-6.2088, 106.8456); // Jakarta Default

  @override
  void initState() {
    super.initState();
    _initTracking();
  }

  Future<void> _initTracking() async {
    // Check device location permission safely
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (mounted && (perm == LocationPermission.always || perm == LocationPermission.whileInUse)) {
        setState(() => _hasLocationPermission = true);
      }
    } catch (_) {}

    final socketService = SocketService();
    await socketService.connect();
    socketService.joinTripMonitoring(widget.tripId);

    // Fetch initial history from REST API
    try {
      final history = await ref.read(tripLocationHistoryProvider(widget.tripId).future);
      if (mounted) {
        setState(() {
          for (final point in history.points) {
            _routePoints.add(point.toLatLng());
          }
          if (history.points.isNotEmpty) {
            _latestPosition = history.points.last;
            _currentSpeedKmh = ((_latestPosition?.speed ?? 0) * 3.6).clamp(0, 200);
            _updateMapElements(
              _latestPosition!.toLatLng(),
              history.officer?['name'] ?? 'Officer',
              heading: _latestPosition?.heading,
            );
          }
          _isLoadingHistory = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingHistory = false);
    }

    // Fetch initial stats
    try {
      final stats = await ref.read(tripLocationStatsProvider(widget.tripId).future);
      if (mounted) {
        setState(() {
          _totalDistanceKm = stats.totalDistanceKm;
        });
      }
    } catch (_) {}

    // Fetch expenses for markers on map
    try {
      final expenses = await ref.read(expensesProvider({'trip_id': widget.tripId}).future);
      if (mounted && expenses.isNotEmpty) {
        setState(() {
          for (final exp in expenses) {
            if (exp.latitude != null && exp.longitude != null) {
              final latLng = LatLng(exp.latitude!, exp.longitude!);
              _markers.add(
                Marker(
                  markerId: MarkerId('expense_${exp.id}'),
                  position: latLng,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    exp.isApproved ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueOrange,
                  ),
                  infoWindow: InfoWindow(
                    title: '🧾 ${exp.category} - Rp ${exp.amount.toStringAsFixed(0)}',
                    snippet: '${exp.description ?? 'Struk Pengeluaran'} (${exp.status.label})',
                  ),
                ),
              );
            }
          }
        });
      }
    } catch (_) {}

    // Listen to realtime socket broadcasts
    _socketSubscription = socketService.locationStream.listen((data) {
      if (!mounted) return;
      final tripId = data['trip_id']?.toString();
      if (tripId == widget.tripId) {
        final loc = data['location'] ?? data;
        final lat = double.tryParse(loc['latitude']?.toString() ?? '0') ?? 0.0;
        final lng = double.tryParse(loc['longitude']?.toString() ?? '0') ?? 0.0;
        final speedMs = double.tryParse(loc['speed']?.toString() ?? '0') ?? 0.0;
        final heading = double.tryParse(loc['heading']?.toString() ?? '0');
        final officerName = data['officer']?['name'] ?? 'Officer';

        final newPoint = LocationPointModel(
          tripId: widget.tripId,
          latitude: lat,
          longitude: lng,
          speed: speedMs,
          heading: heading,
          accuracy: double.tryParse(loc['accuracy']?.toString() ?? ''),
          recordedAt: DateTime.now(),
        );

        setState(() {
          _latestPosition = newPoint;
          _currentSpeedKmh = (speedMs * 3.6).clamp(0, 200);
          _updateMapElements(LatLng(lat, lng), officerName, heading: heading);
        });
      }
    });
  }

  void _updateMapElements(LatLng position, String officerName, {double? heading}) {
    _routePoints.add(position);

    _markers.removeWhere((m) => m.markerId.value == 'officer');
    _markers.add(
      Marker(
        markerId: const MarkerId('officer'),
        position: position,
        rotation: heading ?? 0.0,
        infoWindow: InfoWindow(
          title: officerName,
          snippet: 'Kecepatan: ${_currentSpeedKmh.toStringAsFixed(1)} km/jam',
        ),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
      ),
    );

    _polylines.clear();
    _polylines.add(
      Polyline(
        polylineId: const PolylineId('route_history'),
        points: List.from(_routePoints),
        color: AppColors.primary,
        width: 5,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
      ),
    );

    _mapController?.animateCamera(CameraUpdate.newLatLng(position));
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    SocketService().leaveTripMonitoring(widget.tripId);
    _mapController?.dispose();
    super.dispose();
  }

  Widget _buildStatusBadge(TrackingStatus status, bool isOfficerStreaming) {
    Color badgeColor;
    String label;
    IconData icon;

    if (isOfficerStreaming || status == TrackingStatus.streaming) {
      badgeColor = AppColors.success;
      label = 'LIVE GPS';
      icon = Icons.sensors_rounded;
    } else if (status == TrackingStatus.searchingSignal) {
      badgeColor = AppColors.warning;
      label = 'MENCARI SINYAL';
      icon = Icons.gps_not_fixed_rounded;
    } else if (status == TrackingStatus.permissionDenied) {
      badgeColor = AppColors.error;
      label = 'IZIN DITOLAK';
      icon = Icons.location_disabled_rounded;
    } else {
      badgeColor = Colors.grey;
      label = 'OFFLINE / IDLE';
      icon = Icons.cloud_off_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({required String title, required String value, required IconData icon}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.95),
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [
            BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withOpacity(0.1),
              child: Icon(icon, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final isOfficer = user?.role == 'OFFICER';
    final trackerState = ref.watch(locationTrackerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.tripTitle ?? 'Live GPS Tracking'),
            if (widget.destination != null)
              Text(
                'Tujuan: ${widget.destination}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
          ],
        ),
      ),
      body: Stack(
        children: [
          // 1. Google Map View
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _latestPosition?.toLatLng() ?? _defaultPosition,
              zoom: 15,
            ),
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: _hasLocationPermission,
            myLocationButtonEnabled: _hasLocationPermission,
            onMapCreated: (controller) => _mapController = controller,
          ),

          // 2. Loading history indicator
          if (_isLoadingHistory)
            const Positioned(
              top: 16,
              left: 16,
              child: Card(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                      SizedBox(width: 8),
                      Text('Memuat riwayat rute...', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              ),
            ),

          // 3. Status Badge (Top-Right)
          Positioned(
            top: 16,
            right: 16,
            child: _buildStatusBadge(trackerState.status, trackerState.isStreaming),
          ),

          // 4. Metrics Dashboard Bar (Top-Center below App Bar)
          Positioned(
            top: 60,
            left: 16,
            right: 16,
            child: Row(
              children: [
                _buildMetricCard(
                  title: 'Kecepatan',
                  value: '${_currentSpeedKmh.toStringAsFixed(1)} km/h',
                  icon: Icons.speed_rounded,
                ),
                const SizedBox(width: 8),
                _buildMetricCard(
                  title: 'Jarak Rute',
                  value: '${_totalDistanceKm.toStringAsFixed(2)} km',
                  icon: Icons.route_rounded,
                ),
                const SizedBox(width: 8),
                _buildMetricCard(
                  title: 'Akurasi',
                  value: _latestPosition?.accuracy != null
                      ? '±${_latestPosition!.accuracy!.toStringAsFixed(0)} m'
                      : '-',
                  icon: Icons.my_location_rounded,
                ),
              ],
            ),
          ),

          // 5. Error banner if any
          if (trackerState.errorMessage != null)
            Positioned(
              bottom: isOfficer ? 90 : 24,
              left: 16,
              right: 16,
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(8),
                color: AppColors.error,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          trackerState.errorMessage!,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // 6. Officer Action Controls (Bottom)
          if (isOfficer)
            Positioned(
              bottom: 24,
              left: 24,
              right: 24,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: trackerState.isStreaming ? AppColors.error : AppColors.success,
                  foregroundColor: Colors.white,
                  elevation: 6,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: Icon(
                  trackerState.isStreaming ? Icons.stop_circle_rounded : Icons.play_circle_filled_rounded,
                  size: 24,
                ),
                label: Text(
                  trackerState.isStreaming ? 'Hentikan Streaming GPS' : 'Mulai Streaming GPS Perjalanan',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  if (trackerState.isStreaming) {
                    ref.read(locationTrackerProvider.notifier).stopTracking();
                  } else {
                    ref.read(locationTrackerProvider.notifier).startTracking(widget.tripId);
                  }
                },
              ),
            ),
        ],
      ),
    );
  }
}
