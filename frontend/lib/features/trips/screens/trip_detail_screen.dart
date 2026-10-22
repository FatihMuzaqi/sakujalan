import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_enums.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/trip_provider.dart';
import '../widgets/assign_officer_dialog.dart';

class TripDetailScreen extends ConsumerWidget {
  final String tripId;

  const TripDetailScreen({super.key, required this.tripId});

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
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailProvider(tripId));
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final actionState = ref.watch(tripActionProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);
    final dateFormatter = DateFormat('dd MMMM yyyy, HH:mm');

    final isOfficer = user?.role == 'OFFICER';
    final isManagerOrAbove = user?.role == 'OWNER' || user?.role == 'ADMIN' || user?.role == 'MANAGER';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Perjalanan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.refresh(tripDetailProvider(tripId)),
          ),
          if (isManagerOrAbove)
            PopupMenuButton<String>(
              onSelected: (value) async {
                if (value == 'edit') {
                  context.push('/trips/$tripId/edit');
                } else if (value == 'assign') {
                  showDialog(
                    context: context,
                    builder: (_) => AssignOfficerDialog(tripId: tripId),
                  );
                } else if (value == 'cancel') {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Batalkan Perjalanan?'),
                      content: const Text('Perjalanan yang dibatalkan tidak dapat diaktifkan kembali.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Tidak')),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Ya, Batalkan'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    final ok = await ref.read(tripActionProvider.notifier).updateStatus(tripId, 'CANCELLED');
                    if (context.mounted && ok) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Perjalanan telah dibatalkan.')),
                      );
                    }
                  }
                } else if (value == 'delete') {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Hapus Perjalanan?'),
                      content: const Text('Data draft perjalanan akan dihapus secara permanen.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Hapus'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    final ok = await ref.read(tripActionProvider.notifier).deleteTrip(tripId);
                    if (context.mounted && ok) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Perjalanan berhasil dihapus.')),
                      );
                      context.pop();
                    }
                  }
                }
              },
              itemBuilder: (context) {
                final currentTrip = tripAsync.valueOrNull;
                final isCompletedOrCancelled = currentTrip?.status.isCompleted == true || currentTrip?.status.isCancelled == true;

                return [
                  if (!isCompletedOrCancelled) ...[
                    const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit_outlined, size: 18), SizedBox(width: 8), Text('Edit Perjalanan')])),
                    const PopupMenuItem(value: 'assign', child: Row(children: [Icon(Icons.person_add_outlined, size: 18), SizedBox(width: 8), Text('Tugaskan Petugas')])),
                    const PopupMenuItem(value: 'cancel', child: Row(children: [Icon(Icons.cancel_outlined, size: 18, color: AppColors.error), SizedBox(width: 8), Text('Batalkan Perjalanan', style: TextStyle(color: AppColors.error))])),
                  ],
                  if (currentTrip?.status.isDraft == true)
                    const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline, size: 18, color: AppColors.error), SizedBox(width: 8), Text('Hapus Draft', style: TextStyle(color: AppColors.error))])),
                ];
              },
            ),
        ],
      ),
      body: tripAsync.when(
        data: (trip) {
          final spentAmount = trip.initialBalance - trip.remainingBudget;
          final budgetUsageRatio = trip.initialBalance > 0 ? (spentAmount / trip.initialBalance).clamp(0.0, 1.0) : 0.0;
          final statusColor = _getStatusColor(trip.status);

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(tripDetailProvider(tripId)),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                32 + MediaQuery.of(context).padding.bottom,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Card with Code & Status
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  trip.tripCode,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircleAvatar(radius: 4, backgroundColor: statusColor),
                                    const SizedBox(width: 6),
                                    Text(
                                      trip.status.label.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: statusColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            trip.title,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (trip.description != null && trip.description!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              trip.description!,
                              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Route & Locations Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.route_rounded, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text('Rute Perjalanan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Column(
                                children: [
                                  Icon(Icons.trip_origin_rounded, color: AppColors.primary, size: 20),
                                  SizedBox(height: 24, child: VerticalDivider(thickness: 2, color: AppColors.border)),
                                  Icon(Icons.location_on, color: AppColors.error, size: 20),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Asal (Start Location)', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                        Text(trip.startLocation, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                        if (trip.startLatitude != null && trip.startLongitude != null)
                                          Text('${trip.startLatitude}, ${trip.startLongitude}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Tujuan (Destination)', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                        Text(trip.destination, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                        if (trip.destinationLatitude != null && trip.destinationLongitude != null)
                                          Text('${trip.destinationLatitude}, ${trip.destinationLongitude}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Timeline Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.calendar_month_outlined, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text('Jadwal Waktu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Waktu Mulai', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                    const SizedBox(height: 2),
                                    Text(dateFormatter.format(trip.startAt), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Waktu Selesai', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                                    const SizedBox(height: 2),
                                    Text(dateFormatter.format(trip.endAt), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Budget Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.account_balance_wallet_outlined, color: AppColors.primary, size: 20),
                              SizedBox(width: 8),
                              Text('Anggaran & Pengeluaran', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Budget Awal', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  const SizedBox(height: 2),
                                  Text(
                                    currencyFormatter.format(trip.initialBalance),
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Sisa Budget', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                                  const SizedBox(height: 2),
                                  Text(
                                    currencyFormatter.format(trip.remainingBudget),
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: trip.remainingBudget < (trip.initialBalance * 0.2)
                                          ? AppColors.error
                                          : AppColors.success,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: budgetUsageRatio,
                              minHeight: 8,
                              backgroundColor: AppColors.border,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                budgetUsageRatio > 0.85
                                    ? AppColors.error
                                    : (budgetUsageRatio > 0.6 ? Colors.orange : AppColors.primary),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Terpakai: ${currencyFormatter.format(spentAmount)} (${(budgetUsageRatio * 100).toStringAsFixed(1)}%)',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                side: const BorderSide(color: AppColors.primary),
                              ),
                              onPressed: () => context.push('/trips/$tripId/recap'),
                              icon: const Icon(Icons.picture_as_pdf_rounded, color: AppColors.primary),
                              label: const Text(
                                'Lihat Rekapitulasi & Cetak PDF',
                                style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Officer & Team Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.person_pin_circle_outlined, color: AppColors.primary, size: 20),
                                  SizedBox(width: 8),
                                  Text('Petugas Ditugaskan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                ],
                              ),
                              if (isManagerOrAbove && !trip.status.isCompleted && !trip.status.isCancelled)
                                TextButton(
                                  onPressed: () {
                                    showDialog(
                                      context: context,
                                      builder: (_) => AssignOfficerDialog(
                                        tripId: tripId,
                                        currentOfficerId: trip.officerId,
                                      ),
                                    );
                                  },
                                  child: Text(trip.officerName == null ? '+ Tugaskan' : 'Ubah'),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          if (trip.officerName != null) ...[
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const CircleAvatar(
                                backgroundColor: AppColors.primary,
                                child: Icon(Icons.person, color: Colors.white),
                              ),
                              title: Text(trip.officerName!, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text(trip.officerEmail ?? 'Petugas Lapangan'),
                            ),
                          ] else ...[
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: Text(
                                'Belum ada petugas yang ditugaskan untuk perjalanan ini.',
                                style: TextStyle(color: AppColors.textMuted, fontStyle: FontStyle.italic),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Role-Based Bottom Action Buttons
                  if (isOfficer) ...[
                    if (trip.status.isScheduled) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                          onPressed: actionState.isLoading
                              ? null
                              : () async {
                                  final ok = await ref.read(tripActionProvider.notifier).startTrip(tripId);
                                  if (context.mounted && ok) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Perjalanan berhasil dimulai!'), backgroundColor: AppColors.success),
                                    );
                                  }
                                },
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Mulai Perjalanan (Start Trip)', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ] else if (trip.status.isActive) ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/scan-receipt?tripId=$tripId'),
                              icon: const Icon(Icons.receipt_long),
                              label: const Text('Scan Struk'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                              onPressed: () => context.push('/tracking/$tripId'),
                              icon: const Icon(Icons.gps_fixed),
                              label: const Text('GPS Live'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
                          onPressed: actionState.isLoading
                              ? null
                              : () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Selesaikan Perjalanan?'),
                                      content: const Text('Pastikan semua pengeluaran struk telah dicatat sebelum menyelesaikan.'),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                                        ElevatedButton(
                                          onPressed: () => Navigator.pop(ctx, true),
                                          child: const Text('Selesaikan'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    final ok = await ref.read(tripActionProvider.notifier).completeTrip(tripId);
                                    if (context.mounted && ok) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Perjalanan berhasil diselesaikan!'), backgroundColor: AppColors.success),
                                      );
                                    }
                                  }
                                },
                          icon: const Icon(Icons.check_circle_rounded),
                          label: const Text('Selesaikan Perjalanan (Complete Trip)', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ] else if (isManagerOrAbove) ...[
                    if (trip.status.isDraft) ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/trips/$tripId/edit'),
                              icon: const Icon(Icons.edit),
                              label: const Text('Edit Trip'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final ok = await ref.read(tripActionProvider.notifier).updateStatus(tripId, 'SCHEDULED');
                                if (context.mounted && ok) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Perjalanan dijadwalkan!'), backgroundColor: AppColors.success),
                                  );
                                }
                              },
                              icon: const Icon(Icons.schedule),
                              label: const Text('Jadwalkan'),
                            ),
                          ),
                        ],
                      ),
                    ] else if (trip.status.isScheduled) ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/trips/$tripId/edit'),
                              icon: const Icon(Icons.edit),
                              label: const Text('Edit Trip'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                              onPressed: () async {
                                final ok = await ref.read(tripActionProvider.notifier).startTrip(tripId);
                                if (context.mounted && ok) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Perjalanan dimulai!'), backgroundColor: AppColors.success),
                                  );
                                }
                              },
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Mulai Trip'),
                            ),
                          ),
                        ],
                      ),
                    ] else if (trip.status.isActive) ...[
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                              onPressed: () => context.push('/tracking/$tripId'),
                              icon: const Icon(Icons.location_searching),
                              label: const Text('Monitoring GPS'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
                              onPressed: () async {
                                final ok = await ref.read(tripActionProvider.notifier).completeTrip(tripId);
                                if (context.mounted && ok) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Perjalanan diselesaikan!'), backgroundColor: AppColors.success),
                                  );
                                }
                              },
                              icon: const Icon(Icons.check_circle_outline),
                              label: const Text('Selesaikan'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                  const SizedBox(height: 32),
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
                onPressed: () => ref.refresh(tripDetailProvider(tripId)),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
