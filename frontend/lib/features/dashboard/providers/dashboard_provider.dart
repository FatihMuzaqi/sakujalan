import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sockets/socket_service.dart';
import '../models/dashboard_model.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository();
});

class DashboardRepository {
  final _dio = ApiClient().dio;

  DashboardRepository();

  Future<ManagementDashboardModel> getManagementDashboard() async {
    final response = await _dio.get(ApiEndpoints.dashboardReport);
    final data = response.data;
    if (data != null && data['success'] == true && data['data'] != null) {
      final dataMap = data['data'] as Map<String, dynamic>;
      return ManagementDashboardModel.fromJson(dataMap);
    }
    throw Exception(data?['message'] ?? 'Failed to load dashboard data');
  }
}

final managementDashboardProvider =
    AsyncNotifierProvider.autoDispose<ManagementDashboardNotifier, ManagementDashboardModel>(
  ManagementDashboardNotifier.new,
);

class ManagementDashboardNotifier extends AutoDisposeAsyncNotifier<ManagementDashboardModel> {
  StreamSubscription? _tripStatusSub;
  StreamSubscription? _expenseStatusSub;
  StreamSubscription? _balanceUpdateSub;
  StreamSubscription? _locationSub;

  @override
  Future<ManagementDashboardModel> build() async {
    _listenToRealtimeEvents();

    ref.onDispose(() {
      _tripStatusSub?.cancel();
      _expenseStatusSub?.cancel();
      _balanceUpdateSub?.cancel();
      _locationSub?.cancel();
    });

    final repo = ref.watch(dashboardRepositoryProvider);
    return await repo.getManagementDashboard();
  }

  void _listenToRealtimeEvents() {
    final socket = SocketService();

    _tripStatusSub = socket.tripStatusStream.listen((_) {
      refresh();
    });

    _expenseStatusSub = socket.expenseStatusStream.listen((_) {
      refresh();
    });

    _balanceUpdateSub = socket.balanceUpdateStream.listen((_) {
      refresh();
    });

    _locationSub = socket.locationStream.listen((_) {
      refresh();
    });
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(dashboardRepositoryProvider);
      return await repo.getManagementDashboard();
    });
  }
}
