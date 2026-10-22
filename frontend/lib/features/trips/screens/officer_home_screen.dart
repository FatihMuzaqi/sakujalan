import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/trip_provider.dart';

class OfficerHomeScreen extends ConsumerWidget {
  const OfficerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(officerDashboardProvider);
    final user = ref.watch(authProvider).user;
    final actionState = ref.watch(tripActionProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Officer Dashboard', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text('Halo, ${user?.name ?? 'Petugas'}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Segarkan',
            onPressed: () => ref.refresh(officerDashboardProvider),
          ),
          IconButton(
            icon: const Icon(Icons.list_alt_rounded),
            tooltip: 'Semua Perjalanan',
            onPressed: () => context.push('/trips'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Keluar',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        data: (data) {
          final trip = data.activeTrip;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(officerDashboardProvider),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                32 + MediaQuery.of(context).padding.bottom,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. ACTIVE TRIP BANNER CARD
                  if (trip != null) ...[
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    trip.tripCode,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: (trip.status.isActive ? AppColors.success : Colors.orange).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    trip.status.label.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: trip.status.isActive ? AppColors.success : Colors.orange,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              trip.title,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.location_on, size: 16, color: AppColors.error),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '${trip.startLocation} ➔ ${trip.destination}',
                                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => context.push('/trips/${trip.id}'),
                                    icon: const Icon(Icons.visibility_outlined, size: 16),
                                    label: const Text('Detail'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: () => context.push('/trips/${trip.id}/recap'),
                                    icon: const Icon(Icons.picture_as_pdf_rounded, size: 16),
                                    label: const Text('Rekap & PDF'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            const Icon(Icons.airplanemode_inactive_rounded, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 12),
                            const Text(
                              'Tidak Ada Perjalanan Aktif',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Saat ini Anda tidak memiliki perjalanan dinas yang sedang berjalan atau terjadwal.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => context.push('/trips'),
                              icon: const Icon(Icons.list),
                              label: const Text('Lihat Daftar Perjalanan'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // 2. METRICS & STATUS GRID
                  const Text(
                    'Status & Informasi Keuangan',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      // Sisa Saldo / Balance
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.account_balance_wallet, size: 18, color: AppColors.primary),
                                    SizedBox(width: 6),
                                    Text('Sisa Saldo', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  currencyFormatter.format(data.balance),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),

                      // GPS Status
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.gps_fixed, size: 18, color: AppColors.success),
                                    SizedBox(width: 6),
                                    Text('Status GPS', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 4,
                                      backgroundColor: trip?.status.isActive == true ? AppColors.success : Colors.grey,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      trip?.status.isActive == true ? 'AKTIF' : data.gpsStatus,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: trip?.status.isActive == true ? AppColors.success : AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 3. TODAY'S EXPENSES SUMMARY
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Pengeluaran Hari Ini', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  const SizedBox(height: 4),
                                  Text(
                                    currencyFormatter.format(data.todayExpensesTotal),
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${data.todayExpensesCount} transaksi dicatat hari ini',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 24),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(height: 1, color: AppColors.border),
                          const SizedBox(height: 12),
                          // PRIMARY CTAs: Scan Struk & Tambah Pengeluaran
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                                  label: const Text('Scan Struk (AI)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  onPressed: () => context.push(trip != null ? '/scan-receipt?tripId=${trip.id}' : '/scan-receipt'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  icon: const Icon(Icons.edit_note_rounded, size: 18),
                                  label: const Text('Tambah Manual', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  onPressed: () => context.push(trip != null ? '/expenses/add?tripId=${trip.id}' : '/expenses/add'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 4. QUICK ACTIONS
                  const Text(
                    'Aksi & Kontrol Perjalanan',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),

                  if (trip != null) ...[
                    if (trip.status.isScheduled) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                          onPressed: actionState.isLoading
                              ? null
                              : () async {
                                  final ok = await ref.read(tripActionProvider.notifier).startTrip(trip.id);
                                  if (context.mounted && ok) {
                                    ref.invalidate(officerDashboardProvider);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Perjalanan dimulai! Lokasi GPS kini dimonitor.'),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                  }
                                },
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Mulai Perjalanan Sekarang', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

                    if (trip.status.isActive) ...[
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              onPressed: () => context.push('/tracking/${trip.id}'),
                              icon: const Icon(Icons.gps_fixed),
                              label: const Text('Live GPS'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.indigo,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              onPressed: actionState.isLoading
                                  ? null
                                  : () async {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (ctx) => AlertDialog(
                                          title: const Text('Selesaikan Perjalanan?'),
                                          content: const Text('Pastikan semua struk pengeluaran telah diunggah.'),
                                          actions: [
                                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                                            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Selesaikan')),
                                          ],
                                        ),
                                      );
                                      if (confirm == true) {
                                        final ok = await ref.read(tripActionProvider.notifier).completeTrip(trip.id);
                                        if (context.mounted && ok) {
                                          ref.invalidate(officerDashboardProvider);
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Perjalanan dinas berhasil diselesaikan!'),
                                              backgroundColor: AppColors.success,
                                            ),
                                          );
                                        }
                                      }
                                    },
                              icon: const Icon(Icons.check_circle_rounded),
                              label: const Text('Selesai'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],

                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 44),
                    ),
                    onPressed: () => context.push('/trips'),
                    icon: const Icon(Icons.history_rounded),
                    label: const Text('Riwayat Perjalanan Dinas'),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $err', style: const TextStyle(color: AppColors.error)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(officerDashboardProvider),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
