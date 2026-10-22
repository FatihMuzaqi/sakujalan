import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/sockets/socket_service.dart';
import '../models/user_model.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? user;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio = ApiClient().dio;

  AuthNotifier() : super(const AuthState()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);
    try {
      final token = await TokenStorage.getAccessToken();
      if (token == null) {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
        return;
      }

      final response = await _dio.get(ApiEndpoints.me);
      if (response.statusCode == 200 && response.data['success'] == true) {
        final userData = UserModel.fromJson(response.data['data']['user']);
        await SocketService().connect();
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: userData,
        );
      } else {
        await TokenStorage.clear();
        state = state.copyWith(isLoading: false, isAuthenticated: false);
      }
    } catch (_) {
      await TokenStorage.clear();
      state = state.copyWith(isLoading: false, isAuthenticated: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.post(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final user = UserModel.fromJson(data['user']);
        final tokens = data['tokens'];

        await TokenStorage.saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          role: user.role,
        );

        await SocketService().connect();

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
      String message = 'Gagal login.';
      if (e.response != null && e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      } else if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        message = 'Koneksi ke server timeout. Pastikan backend & ngrok aktif.';
      } else if (e.type == DioExceptionType.connectionError) {
        message = 'Tidak dapat terhubung ke server (${ApiEndpoints.baseUrl}). Pastikan URL benar & backend aktif.';
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      state = state.copyWith(isLoading: false, errorMessage: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> registerOwner({
    required String name,
    required String companyName,
    required String email,
    required String password,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.post(
        ApiEndpoints.register,
        data: {
          'name': name,
          'company_name': companyName,
          'email': email,
          'password': password,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final user = UserModel.fromJson(data['user']);
        final tokens = data['tokens'];

        await TokenStorage.saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          role: user.role,
        );

        await SocketService().connect();

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
      String message = 'Gagal mendaftar perusahaan.';
      if (e.response != null && e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      } else if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        message = 'Koneksi ke server timeout. Pastikan backend & ngrok aktif.';
      } else if (e.type == DioExceptionType.connectionError) {
        message = 'Tidak dapat terhubung ke server (${ApiEndpoints.baseUrl}). Pastikan URL benar & backend aktif.';
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      state = state.copyWith(isLoading: false, errorMessage: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> loginWithGoogle({String? companyName}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
      );

      final account = await googleSignIn.signIn();
      if (account == null) {
        state = state.copyWith(isLoading: false);
        return false;
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;

      final response = await _dio.post(
        ApiEndpoints.googleAuth,
        data: {
          if (idToken != null) 'id_token': idToken,
          'email': account.email,
          'name': account.displayName ?? 'Owner',
          'google_id': account.id,
          'photo_url': account.photoUrl,
          if (companyName != null && companyName.isNotEmpty) 'company_name': companyName,
        },
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final user = UserModel.fromJson(data['user']);
        final tokens = data['tokens'];

        await TokenStorage.saveTokens(
          accessToken: tokens['access_token'],
          refreshToken: tokens['refresh_token'],
          role: user.role,
        );

        await SocketService().connect();

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
        return true;
      }
      return false;
    } on DioException catch (e) {
      String message = 'Gagal login dengan Google.';
      if (e.response != null && e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      } else if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        message = 'Koneksi ke server timeout. Pastikan backend & ngrok aktif.';
      } else if (e.type == DioExceptionType.connectionError) {
        message = 'Tidak dapat terhubung ke server (${ApiEndpoints.baseUrl}). Pastikan URL benar & backend aktif.';
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      state = state.copyWith(isLoading: false, errorMessage: message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Error Google Sign In: ${e.toString()}');
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore network error on logout so user can always logout locally
    }
    SocketService().disconnect();
    await TokenStorage.clear();
    state = const AuthState(isAuthenticated: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
