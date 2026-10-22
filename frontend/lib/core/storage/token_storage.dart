import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _accessTokenKey = 'sakulajan_access_token';
  static const _refreshTokenKey = 'sakulajan_refresh_token';
  static const _userRoleKey = 'sakulajan_user_role';

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required String role,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
    await _storage.write(key: _userRoleKey, value: role);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  static Future<String?> getUserRole() async {
    return await _storage.read(key: _userRoleKey);
  }

  static Future<void> clear() async {
    await _storage.deleteAll();
  }
}
