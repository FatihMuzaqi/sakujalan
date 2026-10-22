import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_enums.dart';
import '../../auth/providers/auth_provider.dart';
import '../../subscription/providers/subscription_provider.dart';
import '../providers/trip_provider.dart';

class TripListScreen extends ConsumerStatefulWidget {
  const TripListScreen({super.key});

  @override
  ConsumerState<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends ConsumerState<TripListScreen> {
  String _selectedStatus = 'ALL';
  final _searchController = TextEditingController();

  final List<Map<String, String>> _statusTabs = [
    {'label': 'Semua', 'value': 'ALL'},
    {'label': 'Draft', 'value': 'DRAFT'},
    {'label': 'Terjadwal', 'value': 'SCHEDULED'},
    {'label': 'Berjalan', 'value': 'ACTIVE'},
    {'label': 'Selesai', 'value': 'COMPLETED'},
    {'label': 'Dibatalkan', 'value': 'CANCELLED'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilter() {
    ref.read(tripFilterProvider.notifier).state = TripFilter(
      status: _selectedStatus == 'ALL' ? null : _selectedStatus,
      search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
    );
  }

  Color _getStatusColor(TripStatus status) {
    switch (status) {
      case TripStatus.draft:
        return AppColors.textSecondary;
      case TripStatus.scheduled:
        return Colors.orange;
      case TripStatus.active:
        return AppColors.success;
      case TripStatus.completed:
        return AppColors.primary;
      case TripStatus.cancelled:
        return AppColors.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripsAsync = ref.watch(tripsProvider);
    final user = ref.watch(authProvider).user;
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);
    final dateFormatter = DateFormat('dd MMM yyyy');

    final subAsync = ref.watch(subscriptionStatusProvider);
    final statusInfo = subAsync.valueOrNull?.statusInfo;
    final isSubscriptionExpired = statusInfo != null && (statusInfo.isReadOnly || statusInfo.status == 'EXPIRED' || !statusInfo.isActive);

    final isOfficer = user?.role == 'OFFICER';
    final isManagerOrAbove = user?.role == 'OWNER' || user?.role == 'ADMIN' || user?.role == 'MANAGER';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perjalanan Dinas (Trips)'),
        actions: [
          if (isOfficer)
            IconButton(
              icon: const Icon(Icons.dashboard_rounded),
              tooltip: 'Officer Home',
              onPressed: () => context.go('/officer/home'),
            )
          else if (isManagerOrAbove)
            IconButton(
              icon: const Icon(Icons.dashboard_rounded),
              tooltip: 'Dashboard Monitoring',
              onPressed: () => context.go('/dashboard'),
            ),
          IconButton(
            icon: const Icon(Icons.receipt_long_rounded),
            tooltip: 'Scan Struk',
            onPressed: () => context.push('/scan-receipt'),
          ),
          IconButton(
            icon: const Icon(Icons.card_membership_rounded),
            tooltip: 'Status Langganan',
            onPressed: () => context.push('/subscription'),
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
      floatingActionButton: isManagerOrAbove
          ? FloatingActionButton.extended(
              onPressed: () {
                if (isSubscriptionExpired) {
                  context.push('/subscription/expired');
                } else {
                  context.push('/trips/create');
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('Buat Trip'),
            )
          : null,
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: Theme.of(context).cardColor,
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari judul, kode, atau destinasi...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilter();
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  onSubmitted: (_) => _applyFilter(),
                ),
                const SizedBox(height: 10),

                // Status Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _statusTabs.map((tab) {
                      final isSelected = _selectedStatus == tab['value'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: FilterChip(
                          label: Text(tab['label']!),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              _selectedStatus = tab['value']!;
                            });
                            _applyFilter();
                          },
                          selectedColor: AppColors.primary.withOpacity(0.15),
                          checkmarkColor: AppColors.primary,
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? AppColors.primary : AppColors.textSecondary,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Trips List Content
          Expanded(
            child: tripsAsync.when(
              data: (trips) {
                if (trips.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.route_outlined, size: 56, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Text(
                            'Belum Ada Perjalanan Dinas',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Tidak ada data perjalanan dinas yang sesuai dengan filter.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                          if (isManagerOrAbove) ...[
                            const SizedBox(height: 20),
                            ElevatedButton.icon(
                              onPressed: () {
                                if (isSubscriptionExpired) {
                                  context.push('/subscription/expired');
                                } else {
                                  context.push('/trips/create');
                                }
                              },
                              icon: const Icon(Icons.add),
                              label: const Text('Buat Perjalanan Sekarang'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(tripsProvider),
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      16,
                      16,
                      (isManagerOrAbove ? 80 : 24) + MediaQuery.of(context).padding.bottom,
                    ),
                    itemCount: trips.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final trip = trips[index];
                      final statusColor = _getStatusColor(trip.status);

                      return Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => context.push('/trips/${trip.id}'),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top row: Code & Status
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        trip.tripCode,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: statusColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          CircleAvatar(radius: 3.5, backgroundColor: statusColor),
                                          const SizedBox(width: 4),
                                          Text(
                                            trip.status.label.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: statusColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),

                                // Title
                                Text(
                                  trip.title,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),

                                // Route
                                Row(
                                  children: [
                                    const Icon(Icons.location_on_outlined, size: 15, color: AppColors.textSecondary),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        '${trip.startLocation} ➔ ${trip.destination}',
                                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),

                                // Dates
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textMuted),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${dateFormatter.format(trip.startAt)} - ${dateFormatter.format(trip.endAt)}',
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                    if (trip.officerName != null) ...[
                                      const SizedBox(width: 12),
                                      const Icon(Icons.person_outline, size: 14, color: AppColors.textMuted),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          trip.officerName!,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),

                                const SizedBox(height: 12),
                                const Divider(height: 1),
                                const SizedBox(height: 12),

                                // Bottom Row: Budget & Actions
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Sisa Saldo / Budget', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                        Text(
                                          currencyFormatter.format(trip.remainingBudget),
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: trip.remainingBudget < (trip.initialBalance * 0.2) ? AppColors.error : AppColors.primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        if (trip.status.isActive)
                                          IconButton(
                                            tooltip: 'GPS Tracking',
                                            icon: const Icon(Icons.gps_fixed, color: AppColors.primary, size: 20),
                                            onPressed: () => context.push('/tracking/${trip.id}'),
                                          ),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            minimumSize: const Size(80, 34),
                                            padding: const EdgeInsets.symmetric(horizontal: 12),
                                          ),
                                          onPressed: () => context.push('/trips/${trip.id}'),
                                          child: const Text('Detail', style: TextStyle(fontSize: 13)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) {
                String errorMessage = 'Gagal memuat daftar perjalanan. Silakan coba lagi.';
                if (err.toString().contains('404')) {
                  errorMessage = '⚠️ Endpoint / Server tidak ditemukan (HTTP 404).\nMohon pastikan server backend berjalan dan URL ngrok/API terkonfigurasi dengan benar.';
                } else if (err.toString().contains('SocketException') || err.toString().contains('TimeoutException')) {
                  errorMessage = '🔌 Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
                }

                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          errorMessage,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.error, fontSize: 13, height: 1.4),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => ref.refresh(tripsProvider),
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Coba Lagi'),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
