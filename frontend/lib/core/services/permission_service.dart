import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permission_handler/permission_handler.dart';
import '../constants/app_colors.dart';

/// Service to handle unified runtime permissions for TripEx SaaS (GPS, Camera, Storage, Notification).
class PermissionService {
  static const _storage = FlutterSecureStorage();
  static const _permRequestedKey = 'tripex_initial_permissions_prompted_v1';

  /// List of essential permissions required by TripEx.
  static List<Permission> get essentialPermissions {
    final permissions = <Permission>[
      Permission.location,
      Permission.camera,
      Permission.notification,
    ];

    if (Platform.isAndroid) {
      permissions.add(Permission.storage);
      permissions.add(Permission.photos);
    } else if (Platform.isIOS) {
      permissions.add(Permission.photos);
    }

    return permissions;
  }

  /// Check if the first-time permission prompt has already been executed on this installation.
  static Future<bool> hasPromptedInitialPermissions() async {
    try {
      final value = await _storage.read(key: _permRequestedKey);
      return value == 'true';
    } catch (_) {
      return false;
    }
  }

  /// Mark that initial permissions prompt has been executed.
  static Future<void> markInitialPermissionsPrompted() async {
    try {
      await _storage.write(key: _permRequestedKey, value: 'true');
    } catch (_) {}
  }

  /// Automatically requests all essential permissions from the operating system directly.
  /// This pops up the native OS permission dialogs for GPS, Notification, Camera, and Photos/Storage.
  static Future<Map<Permission, PermissionStatus>> requestAllPermissions() async {
    final Map<Permission, PermissionStatus> statuses = {};

    try {
      // 1. Location (GPS)
      final locStatus = await Permission.location.request();
      statuses[Permission.location] = locStatus;
    } catch (_) {}

    try {
      // 2. Notifications (Android 13+ & iOS)
      final notifStatus = await Permission.notification.request();
      statuses[Permission.notification] = notifStatus;
    } catch (_) {}

    try {
      // 3. Camera (for OCR & receipt scanning)
      final camStatus = await Permission.camera.request();
      statuses[Permission.camera] = camStatus;
    } catch (_) {}

    try {
      // 4. Photos / Media Storage
      if (Platform.isAndroid) {
        final photosStatus = await Permission.photos.request();
        statuses[Permission.photos] = photosStatus;
        final storageStatus = await Permission.storage.request();
        statuses[Permission.storage] = storageStatus;
      } else if (Platform.isIOS) {
        final photosStatus = await Permission.photos.request();
        statuses[Permission.photos] = photosStatus;
      }
    } catch (_) {}

    await markInitialPermissionsPrompted();
    return statuses;
  }

  /// Checks if all core essential permissions are currently granted.
  static Future<bool> areCorePermissionsGranted() async {
    try {
      final loc = await Permission.location.isGranted;
      final cam = await Permission.camera.isGranted;
      return loc && cam;
    } catch (_) {
      return false;
    }
  }

  /// Check and trigger automatic permissions on app launch.
  /// If it is the first install/launch, it triggers the native OS prompts automatically.
  static Future<void> promptInitialLaunchPermissions(BuildContext context) async {
    final alreadyPrompted = await hasPromptedInitialPermissions();
    if (!alreadyPrompted) {
      // Direct auto-request on first install
      await requestAllPermissions();
    }
  }

  /// Granular helper for Camera permission with user-friendly alert if permanently denied.
  static Future<bool> requestCameraPermission(BuildContext context) async {
    try {
      final status = await Permission.camera.request();
      if (status.isPermanentlyDenied && context.mounted) {
        _showDeniedDialog(context, 'Kamera');
        return false;
      }
      return status.isGranted;
    } catch (_) {
      return true;
    }
  }

  /// Granular helper for Photos/Storage permission with user-friendly alert if permanently denied.
  static Future<bool> requestPhotosPermission(BuildContext context) async {
    try {
      if (Platform.isAndroid) {
        // Modern Android (API 33+) uses system photo picker which requires no runtime permissions
        final photoStatus = await Permission.photos.status;
        if (photoStatus.isGranted) return true;
        
        // Attempt to request photos permission if not determined
        if (photoStatus.isDenied) {
          await Permission.photos.request();
        }
        // ImagePicker safely fallbacks to SAF/Photo Picker, return true so user can select receipt
        return true;
      } else {
        final status = await Permission.photos.request();
        if (status.isPermanentlyDenied && context.mounted) {
          _showDeniedDialog(context, 'Galeri Foto');
          return false;
        }
        return status.isGranted;
      }
    } catch (_) {
      return true;
    }
  }

  /// Granular helper for Location permission with user-friendly alert if permanently denied.
  static Future<bool> requestLocationPermission(BuildContext context) async {
    try {
      final status = await Permission.location.request();
      if (status.isPermanentlyDenied && context.mounted) {
        _showDeniedDialog(context, 'Lokasi GPS');
        return false;
      }
      return status.isGranted;
    } catch (_) {
      return true;
    }
  }

  static void _showDeniedDialog(BuildContext context, String permissionName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Izin $permissionName Diperlukan'),
        content: Text(
          'Fitur ini membutuhkan akses $permissionName. Anda dapat mengaktifkannya langsung di menu Pengaturan Aplikasi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              openSettings();
            },
            child: const Text('Buka Pengaturan'),
          ),
        ],
      ),
    );
  }

  /// Open application settings page in device settings.
  static Future<bool> openSettings() async {
    return await openAppSettings();
  }

  /// Shows an attractive, informative permission bottom sheet explaining why permissions are required.
  static Future<void> showPermissionBottomSheet(
    BuildContext context, {
    VoidCallback? onDone,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PermissionRationaleSheet(onDone: onDone),
    );
  }
}

/// Bottom Sheet UI widget to explain and request all app permissions gracefully.
class PermissionRationaleSheet extends StatefulWidget {
  final VoidCallback? onDone;
  const PermissionRationaleSheet({super.key, this.onDone});

  @override
  State<PermissionRationaleSheet> createState() => _PermissionRationaleSheetState();
}

class _PermissionRationaleSheetState extends State<PermissionRationaleSheet> {
  bool _isRequesting = false;
  bool _hasLocation = false;
  bool _hasCamera = false;
  bool _hasNotification = false;
  bool _hasStorage = false;

  @override
  void initState() {
    super.initState();
    _checkCurrentStatuses();
  }

  Future<void> _checkCurrentStatuses() async {
    try {
      final loc = await Permission.location.isGranted;
      final cam = await Permission.camera.isGranted;
      final notif = await Permission.notification.isGranted;
      final storage = await Permission.photos.isGranted || await Permission.storage.isGranted;

      if (mounted) {
        setState(() {
          _hasLocation = loc;
          _hasCamera = cam;
          _hasNotification = notif;
          _hasStorage = storage;
        });
      }
    } catch (_) {}
  }

  Future<void> _handleRequestAll() async {
    setState(() => _isRequesting = true);
    await PermissionService.requestAllPermissions();
    await _checkCurrentStatuses();
    if (mounted) {
      setState(() => _isRequesting = false);
      Navigator.of(context).pop();
      widget.onDone?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.security_rounded, color: AppColors.primary, size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Izin Akses Aplikasi TripEx',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Dibutuhkan agar seluruh fitur berjalan optimal',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildPermissionItem(
              icon: Icons.location_on_rounded,
              color: Colors.blue,
              title: 'Lokasi & GPS',
              subtitle: 'Pelacakan realtime rute perjalanan dinas dan geofencing',
              isGranted: _hasLocation,
            ),
            const SizedBox(height: 12),
            _buildPermissionItem(
              icon: Icons.notifications_active_rounded,
              color: Colors.orange,
              title: 'Notifikasi Sistem',
              subtitle: 'Update persetujuan biaya, status trip, dan peringatan penting',
              isGranted: _hasNotification,
            ),
            const SizedBox(height: 12),
            _buildPermissionItem(
              icon: Icons.camera_alt_rounded,
              color: Colors.teal,
              title: 'Kamera',
              subtitle: 'Memotret nota struk biaya secara langsung untuk scan AI OCR',
              isGranted: _hasCamera,
            ),
            const SizedBox(height: 12),
            _buildPermissionItem(
              icon: Icons.photo_library_rounded,
              color: Colors.purple,
              title: 'Galeri & Berkas Media',
              subtitle: 'Mengambil lampiran foto struk dan dokumen klaim dari perangkat',
              isGranted: _hasStorage,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isRequesting ? null : _handleRequestAll,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isRequesting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'Izinkan Semua Akses',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                widget.onDone?.call();
              },
              child: const Text(
                'Nanti Saja',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required bool isGranted,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isGranted ? Colors.green.withOpacity(0.06) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isGranted ? Colors.green.withOpacity(0.25) : Colors.grey.shade200,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (isGranted)
            const Icon(Icons.check_circle_rounded, color: Colors.green, size: 22)
          else
            Icon(Icons.radio_button_unchecked_rounded, color: Colors.grey.shade400, size: 22),
        ],
      ),
    );
  }
}
