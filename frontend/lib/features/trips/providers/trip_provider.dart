import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/trip_model.dart';

// State for trip filtering
class TripFilter {
  final String? status;
  final String? search;

  const TripFilter({this.status, this.search});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TripFilter &&
          runtimeType == other.runtimeType &&
          status == other.status &&
          search == other.search;

  @override
  int get hashCode => status.hashCode ^ search.hashCode;
}

final tripFilterProvider = StateProvider<TripFilter>((ref) => const TripFilter());

// Provider for listing trips with filtering
final tripsProvider = FutureProvider.autoDispose<List<TripModel>>((ref) async {
  final dio = ApiClient().dio;
  final filter = ref.watch(tripFilterProvider);

  final Map<String, dynamic> queryParams = {};
  if (filter.status != null && filter.status!.isNotEmpty && filter.status != 'ALL') {
    queryParams['status'] = filter.status;
  }
  if (filter.search != null && filter.search!.isNotEmpty) {
    queryParams['search'] = filter.search;
  }

  final response = await dio.get(
    ApiEndpoints.trips,
    queryParameters: queryParams.isNotEmpty ? queryParams : null,
  );

  if (response.data['success'] == true) {
    final List list = response.data['data'] ?? [];
    return list.map((item) => TripModel.fromJson(item)).toList();
  }
  return [];
});

// Provider for fetching single trip detail
final tripDetailProvider = FutureProvider.autoDispose.family<TripModel, String>((ref, tripId) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.tripDetail(tripId));
  if (response.data['success'] == true) {
    return TripModel.fromJson(response.data['data']);
  }
  throw Exception(response.data['message'] ?? 'Gagal memuat detail perjalanan');
});

// Provider for Officer Dashboard
final officerDashboardProvider = FutureProvider.autoDispose<OfficerDashboardData>((ref) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.officerDashboard);
  if (response.data['success'] == true) {
    return OfficerDashboardData.fromJson(response.data['data']);
  }
  throw Exception(response.data['message'] ?? 'Gagal memuat data officer dashboard');
});

// StateNotifier for Trip mutation actions
class TripActionState {
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const TripActionState({
    this.isLoading = false,
    this.error,
    this.successMessage,
  });
}

class TripActionNotifier extends StateNotifier<TripActionState> {
  final Ref ref;
  TripActionNotifier(this.ref) : super(const TripActionState());

  Future<TripModel?> createTrip(Map<String, dynamic> tripData) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(ApiEndpoints.trips, data: tripData);
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Perjalanan dinas berhasil dibuat',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(officerDashboardProvider);
        return TripModel.fromJson(response.data['data']);
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal membuat perjalanan',
        );
        return null;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return null;
    }
  }

  Future<TripModel?> updateTrip(String tripId, Map<String, dynamic> tripData) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.put(ApiEndpoints.tripDetail(tripId), data: tripData);
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Perjalanan berhasil diperbarui',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(tripDetailProvider(tripId));
        ref.invalidate(officerDashboardProvider);
        return TripModel.fromJson(response.data['data']);
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal memperbarui perjalanan',
        );
        return null;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return null;
    }
  }

  Future<bool> deleteTrip(String tripId) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.delete(ApiEndpoints.tripDetail(tripId));
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Perjalanan berhasil dihapus',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(officerDashboardProvider);
        return true;
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal menghapus perjalanan',
        );
        return false;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> assignOfficer(String tripId, String officerId) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(
        ApiEndpoints.assignOfficer(tripId),
        data: {'officer_id': officerId},
      );
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Petugas berhasil ditugaskan',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(tripDetailProvider(tripId));
        ref.invalidate(officerDashboardProvider);
        return true;
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal menugaskan petugas',
        );
        return false;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> startTrip(String tripId) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(ApiEndpoints.startTrip(tripId));
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Perjalanan berhasil dimulai',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(tripDetailProvider(tripId));
        ref.invalidate(officerDashboardProvider);
        return true;
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal memulai perjalanan',
        );
        return false;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> completeTrip(String tripId) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(ApiEndpoints.completeTrip(tripId));
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Perjalanan berhasil diselesaikan',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(tripDetailProvider(tripId));
        ref.invalidate(officerDashboardProvider);
        return true;
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal menyelesaikan perjalanan',
        );
        return false;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateStatus(String tripId, String status) async {
    state = const TripActionState(isLoading: true);
    try {
      final dio = ApiClient().dio;
      final response = await dio.put(
        ApiEndpoints.updateTripStatus(tripId),
        data: {'status': status},
      );
      if (response.data['success'] == true) {
        state = TripActionState(
          isLoading: false,
          successMessage: response.data['message'] ?? 'Status perjalanan berhasil diubah',
        );
        ref.invalidate(tripsProvider);
        ref.invalidate(tripDetailProvider(tripId));
        ref.invalidate(officerDashboardProvider);
        return true;
      } else {
        state = TripActionState(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal mengubah status perjalanan',
        );
        return false;
      }
    } catch (e) {
      state = TripActionState(isLoading: false, error: e.toString());
      return false;
    }
  }
}

final tripActionProvider = StateNotifierProvider<TripActionNotifier, TripActionState>((ref) {
  return TripActionNotifier(ref);
});
