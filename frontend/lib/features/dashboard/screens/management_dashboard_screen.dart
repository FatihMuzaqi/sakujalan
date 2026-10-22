import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../auth/providers/auth_provider.dart';
import '../../subscription/models/subscription_model.dart';
import '../../subscription/providers/subscription_provider.dart';
import '../models/dashboard_model.dart';
import '../providers/dashboard_provider.dart';

class ManagementDashboardScreen extends ConsumerWidget {
  const ManagementDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(managementDashboardProvider);
    final subAsync = ref.watch(subscriptionStatusProvider);
    final user = ref.watch(authProvider).user;
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);

    final statusInfo = subAsync.valueOrNull?.statusInfo;
    final isTrialExpired = statusInfo != null && (statusInfo.isReadOnly || statusInfo.status == 'EXPIRED');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dashboard Monitoring',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              user?.name != null ? '${user?.name ?? ''} • ${user?.role.toUpperCase() ?? 'OWNER'}' : 'Kondisi Operasional Perusahaan',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Segarkan Data',
            onPressed: () {
              ref.read(managementDashboardProvider.notifier).refresh();
              ref.read(subscriptionStatusProvider.notifier).refresh();
            },
          ),
          IconButton(
            icon: const Icon(Icons.people_outline_rounded),
            tooltip: 'Kelola Tim',
            onPressed: () => context.push('/company/members'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Keluar',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        data: (dashboard) => RefreshIndicator(
          onRefresh: () async {
            await Future.wait([
              ref.read(managementDashboardProvider.notifier).refresh(),
              ref.read(subscriptionStatusProvider.notifier).refresh(),
            ]);
          },
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
                // 0. TRIAL EXPIRED NOTIFICATION BANNER (Only shown when 1-month trial has expired)
                if (isTrialExpired) _buildExpiredTrialBanner(context, statusInfo),

                // 0.1 NEW TENANT ONBOARDING BANNER (Shown when totalTripsCount == 0)
                if (dashboard.kpis.totalTripsCount == 0) _buildNewTenantWelcomeBanner(context, isTrialExpired),

                // 1. HEADER SUMMARY BANNER
                _buildHeaderStatusCard(dashboard.kpis),

                const SizedBox(height: 16),

                // 2. PRIMARY KPIS GRID
                const Text(
                  'Ringkasan Keuangan & Operasional',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                _buildKpiGrid(dashboard.kpis, currencyFormatter, context),

                const SizedBox(height: 20),

                // 3. ACTIVE TRIPS & REALTIME LOCATIONS
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Perjalanan Aktif Berlangsung',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => context.push('/trips'),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                      label: const Text('Semua'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildActiveTripsSection(dashboard.activeTrips, currencyFormatter, context),

                const SizedBox(height: 20),

                // 4. SPENDING BY CATEGORY BREAKDOWN
                if (dashboard.expensesByCategory.isNotEmpty) ...[
                  const Text(
                    'Distribusi Pengeluaran',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _buildCategoryBreakdownCard(dashboard.expensesByCategory, currencyFormatter),
                  const SizedBox(height: 20),
                ],

                // 5. RECENT ACTIVITIES AUDIT FEED
                const Text(
                  'Aktivitas Terbaru',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                _buildRecentActivitiesList(dashboard.recentActivities),

                const SizedBox(height: 24),

                // 6. QUICK ACTIONS SHORTCUTS
                _buildQuickActionButtons(context, isTrialExpired),
              ],
            ),
          ),
        ),
        loading: () => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Memuat Dashboard Monitoring...',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Menghubungkan data operasional perusahaan',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                Text(
                  'Gagal memuat dashboard: $err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.error),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => ref.read(managementDashboardProvider.notifier).refresh(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderStatusCard(DashboardKpiModel kpis) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.insights_rounded, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  kpis.activeTripsCount > 0
                      ? '${kpis.activeTripsCount} Perjalanan Sedang Berlangsung'
                      : 'Semua Perjalanan Selesai / Terjadwal',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${kpis.activeOfficersCount} Petugas aktif di lapangan • ${kpis.pendingExpensesCount} Pengajuan menunggu review',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiGrid(
    DashboardKpiModel kpis,
    NumberFormat currencyFormatter,
    BuildContext context,
  ) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.25,
      children: [
        // 1. Active Trips
        _buildKpiCard(
          title: 'Trip Aktif',
          value: '${kpis.activeTripsCount}',
          subtitle: '${kpis.scheduledTripsCount} terjadwal',
          icon: Icons.flight_takeoff_rounded,
          iconColor: AppColors.primary,
          onTap: () => context.push('/trips'),
        ),
        // 2. Pending Expenses
        _buildKpiCard(
          title: 'Pending Review',
          value: '${kpis.pendingExpensesCount}',
          subtitle: currencyFormatter.format(kpis.pendingExpensesAmount),
          icon: Icons.hourglass_top_rounded,
          iconColor: Colors.orange,
          onTap: () => context.push('/expenses/pending'),
        ),
        // 3. Total Spending
        _buildKpiCard(
          title: 'Total Pengeluaran',
          value: currencyFormatter.format(kpis.totalSpending),
          subtitle: '${kpis.utilizationPercentage}% dari budget',
          icon: Icons.receipt_long_rounded,
          iconColor: AppColors.error,
          onTap: () => context.push('/expenses'),
        ),
        // 4. Remaining Budget
        _buildKpiCard(
          title: 'Sisa Saldo Kas',
          value: currencyFormatter.format(kpis.remainingBudget),
          subtitle: 'Alokasi ${currencyFormatter.format(kpis.totalAllocatedBudget)}',
          icon: Icons.account_balance_wallet_rounded,
          iconColor: AppColors.success,
          onTap: () => context.push('/wallet/ledger'),
        ),
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500),
                ),
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: iconColor, size: 16),
                ),
              ],
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTripsSection(
    List<ActiveTripSummaryModel> activeTrips,
    NumberFormat currencyFormatter,
    BuildContext context,
  ) {
    if (activeTrips.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: const Column(
          children: [
            Icon(Icons.directions_car_outlined, size: 36, color: AppColors.textMuted),
            SizedBox(height: 8),
            Text(
              'Tidak ada perjalanan dinas yang sedang aktif saat ini.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: activeTrips.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final trip = activeTrips[index];
        final officerName = trip.officer?.name ?? 'Petugas';
        final hasLocation = trip.latestLocation != null;

        return InkWell(
          onTap: () => context.push('/trips/${trip.id}'),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        trip.tripCode.isNotEmpty ? trip.tripCode : 'TRIP AKTIF',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 3.5,
                          backgroundColor: hasLocation ? AppColors.success : Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          hasLocation ? 'GPS Live' : 'Menunggu Sinyal',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: hasLocation ? AppColors.success : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  trip.title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.person_outline_rounded, size: 14, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      officerName,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.error),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '➔ ${trip.destination.isNotEmpty ? trip.destination : 'Lokasi Tujuan'}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Sisa Kas: ${currencyFormatter.format(trip.remainingBudget)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                    ),
                    if (hasLocation)
                      InkWell(
                        onTap: () => context.push('/tracking/${trip.id}'),
                        child: const Row(
                          children: [
                            Icon(Icons.map_rounded, size: 14, color: AppColors.primary),
                            SizedBox(width: 4),
                            Text(
                              'Buka Peta GPS',
                              style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCategoryBreakdownCard(
    List<CategorySpendingModel> categories,
    NumberFormat currencyFormatter,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: categories.map((cat) {
          final progress = (cat.percentage.isNaN || cat.percentage.isInfinite)
              ? 0.0
              : (cat.percentage / 100).clamp(0.0, 1.0);

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    cat.category,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: AppColors.border,
                      valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                      minHeight: 6,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: Text(
                    currencyFormatter.format(cat.totalAmount),
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildRecentActivitiesList(List<RecentActivityModel> activities) {
    if (activities.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: const Text(
          'Belum ada riwayat aktivitas terbaru.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: activities.length,
        separatorBuilder: (_, __) => const Divider(height: 12, color: AppColors.border),
        itemBuilder: (context, index) {
          final item = activities[index];
          final isExpense = item.type == 'EXPENSE';
          final formattedTime = AppFormatters.formatDateTime(item.timestamp);

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: (isExpense ? Colors.amber : Colors.blue).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isExpense ? Icons.receipt_outlined : Icons.directions_car_filled_outlined,
                  size: 14,
                  color: isExpense ? Colors.amber[800] : Colors.blue[700],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.description,
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Text(
                formattedTime,
                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildQuickActionButtons(BuildContext context, bool isExpired) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              if (isExpired) {
                context.push('/subscription/expired');
              } else {
                context.push('/trips/create');
              }
            },
            icon: const Icon(Icons.add_rounded, size: 16),
            label: const Text('Buat Trip Baru', style: TextStyle(fontSize: 12)),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.push('/expenses/pending'),
            icon: const Icon(Icons.checklist_rounded, size: 16),
            label: const Text('Review Pengajuan', style: TextStyle(fontSize: 12)),
          ),
        ),
      ],
    );
  }

  Widget _buildExpiredTrialBanner(BuildContext context, SubscriptionStatusInfo statusInfo) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.error.withOpacity(0.35)),
        boxShadow: [
          BoxShadow(
            color: AppColors.error.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_clock_rounded, color: AppColors.error, size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Masa Uji Coba 1 Bulan Telah Berakhir',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'Read-Only',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Masa uji coba gratis 1 bulan perusahaan Anda telah selesai. Saat ini akun dalam status hanya-baca (Read-Only). Tingkatkan ke paket berlangganan untuk melanjutkan pembuatan transaksi & perjalanan dinas.',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => context.push('/subscription/checkout'),
              icon: const Icon(Icons.rocket_launch_rounded, size: 18),
              label: const Text(
                'Perpanjang / Upgrade Paket Sekarang',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewTenantWelcomeBanner(BuildContext context, bool isExpired) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary,
            AppColors.primary.withOpacity(0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Selamat Datang di TripEx!',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Akun perusahaan Anda telah aktif dengan akses penuh trial 1 bulan gratis. Mulai dengan membuat perjalanan dinas pertama atau kelola tim pegawai Anda.',
            style: TextStyle(fontSize: 12, color: Colors.white70, height: 1.4),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  if (isExpired) {
                    context.push('/subscription/expired');
                  } else {
                    context.push('/trips/create');
                  }
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Buat Trip Pertama'),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white60),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => context.push('/company/members'),
                icon: const Icon(Icons.person_add_outlined, size: 16),
                label: const Text('Kelola Tim'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
