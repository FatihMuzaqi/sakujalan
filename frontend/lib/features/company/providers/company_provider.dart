import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/company_model.dart';
import '../models/member_model.dart';

// Provider for fetching Company Profile & Subscription info
final companyProfileProvider = FutureProvider.autoDispose<CompanyProfileResponse>((ref) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.company);
  if (response.data['success'] == true) {
    return CompanyProfileResponse.fromJson(response.data['data']);
  }
  throw Exception(response.data['message'] ?? 'Failed to load company profile');
});

// Provider for fetching Company Members list
final companyMembersProvider = FutureProvider.autoDispose<List<MemberModel>>((ref) async {
  final dio = ApiClient().dio;
  final response = await dio.get(ApiEndpoints.companyMembers);
  if (response.data['success'] == true) {
    final List list = response.data['data'] ?? [];
    return list.map((item) => MemberModel.fromJson(item)).toList();
  }
  return [];
});

// State for Company actions
class CompanyActionState {
  final bool isLoading;
  final String? errorMessage;
  final String? successMessage;

  const CompanyActionState({
    this.isLoading = false,
    this.errorMessage,
    this.successMessage,
  });

  CompanyActionState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? successMessage,
  }) {
    return CompanyActionState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }
}

class CompanyActionNotifier extends StateNotifier<CompanyActionState> {
  final Ref ref;

  CompanyActionNotifier(this.ref) : super(const CompanyActionState());

  /// Update company profile details
  Future<bool> updateCompanyProfile({
    String? name,
    String? phone,
    String? address,
    String? email,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null, successMessage: null);
    try {
      final dio = ApiClient().dio;
      final payload = <String, dynamic>{};
      if (name != null) payload['name'] = name;
      if (phone != null) payload['phone'] = phone;
      if (address != null) payload['address'] = address;
      if (email != null) payload['email'] = email;

      final response = await dio.put(ApiEndpoints.company, data: payload);
      if (response.data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Profil perusahaan berhasil diperbarui',
        );
        ref.invalidate(companyProfileProvider);
        return true;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.data['message'] ?? 'Gagal memperbarui profil perusahaan',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  /// Add a new member to the company
  Future<bool> addMember({
    required String name,
    required String email,
    required String password,
    String? phone,
    required String role,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null, successMessage: null);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(
        ApiEndpoints.companyMembers,
        data: {
          'name': name,
          'email': email,
          'password': password,
          'phone': phone,
          'role': role,
        },
      );

      if (response.data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Anggota baru berhasil ditambahkan',
        );
        ref.invalidate(companyMembersProvider);
        ref.invalidate(companyProfileProvider);
        return true;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.data['message'] ?? 'Gagal menambahkan anggota',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  /// Update existing member role or details
  Future<bool> updateMember({
    required String memberId,
    String? name,
    String? phone,
    String? role,
    String? status,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null, successMessage: null);
    try {
      final dio = ApiClient().dio;
      final payload = <String, dynamic>{};
      if (name != null) payload['name'] = name;
      if (phone != null) payload['phone'] = phone;
      if (role != null) payload['role'] = role;
      if (status != null) payload['status'] = status;

      final response = await dio.put(
        ApiEndpoints.companyMember(memberId),
        data: payload,
      );

      if (response.data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Data anggota berhasil diperbarui',
        );
        ref.invalidate(companyMembersProvider);
        return true;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.data['message'] ?? 'Gagal memperbarui anggota',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  /// Delete member from company
  Future<bool> deleteMember(String memberId) async {
    state = state.copyWith(isLoading: true, errorMessage: null, successMessage: null);
    try {
      final dio = ApiClient().dio;
      final response = await dio.delete(ApiEndpoints.companyMember(memberId));

      if (response.data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Anggota berhasil dihapus dari perusahaan',
        );
        ref.invalidate(companyMembersProvider);
        ref.invalidate(companyProfileProvider);
        return true;
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.data['message'] ?? 'Gagal menghapus anggota',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }
}

final companyActionProvider = StateNotifierProvider.autoDispose<CompanyActionNotifier, CompanyActionState>((ref) {
  return CompanyActionNotifier(ref);
});
