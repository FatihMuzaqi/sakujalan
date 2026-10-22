import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_endpoints.dart';
import '../storage/token_storage.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  io.Socket? _socket;
  final _locationController = StreamController<Map<String, dynamic>>.broadcast();
  final _tripStatusController = StreamController<Map<String, dynamic>>.broadcast();
  final _expenseStatusController = StreamController<Map<String, dynamic>>.broadcast();
  final _balanceUpdateController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;
  Stream<Map<String, dynamic>> get tripStatusStream => _tripStatusController.stream;
  Stream<Map<String, dynamic>> get expenseStatusStream => _expenseStatusController.stream;
  Stream<Map<String, dynamic>> get balanceUpdateStream => _balanceUpdateController.stream;
  bool get isConnected => _socket?.connected ?? false;

  factory SocketService() => _instance;
  SocketService._internal();

  Future<void> connect() async {
    final token = await TokenStorage.getAccessToken();
    if (token == null) return;

    if (_socket != null && _socket!.connected) return;

    _socket = io.io(
      ApiEndpoints.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket?.connect();

    _socket?.onConnect((_) {
      // ignore: avoid_print
      print('✅ Connected to TripEx Realtime Gateway');
    });

    _socket?.on('trip:location:broadcast', (data) {
      if (data is Map<String, dynamic>) {
        _locationController.add(data);
      }
    });

    _socket?.on('location:update', (data) {
      if (data is Map<String, dynamic>) {
        _locationController.add(data);
      }
    });

    _socket?.on('trip:status', (data) {
      if (data is Map<String, dynamic>) {
        _tripStatusController.add(data);
      }
    });

    _socket?.on('expense:status', (data) {
      if (data is Map<String, dynamic>) {
        _expenseStatusController.add(data);
      }
    });

    _socket?.on('balance:update', (data) {
      if (data is Map<String, dynamic>) {
        _balanceUpdateController.add(data);
      }
    });

    // ignore: avoid_print
    _socket?.onDisconnect((_) => print('🔌 Disconnected from Realtime Gateway'));
  }

  void joinTripMonitoring(String tripId) {
    _socket?.emit('trip:join', {'trip_id': tripId});
    _socket?.emit('trip:join_monitoring', {'trip_id': tripId});
  }

  void leaveTripMonitoring(String tripId) {
    _socket?.emit('trip:leave', {'trip_id': tripId});
    _socket?.emit('trip:leave_monitoring', {'trip_id': tripId});
  }

  void emitLocationUpdate({
    required String tripId,
    required double latitude,
    required double longitude,
    double? speed,
    double? accuracy,
    double? heading,
    double? batteryLevel,
    DateTime? recordedAt,
  }) {
    final payload = {
      'trip_id': tripId,
      'latitude': latitude,
      'longitude': longitude,
      'speed': speed,
      'accuracy': accuracy,
      'heading': heading,
      'battery_level': batteryLevel,
      'recorded_at': (recordedAt ?? DateTime.now()).toIso8601String(),
    };

    _socket?.emit('location:update', payload);
    _socket?.emit('trip:location:update', payload);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
