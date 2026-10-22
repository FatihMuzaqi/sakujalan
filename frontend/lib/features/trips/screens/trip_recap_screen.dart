import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../providers/trip_provider.dart';
import '../../expenses/providers/expense_provider.dart';
import '../../expenses/models/expense_model.dart';
import '../../tracking/providers/location_provider.dart';
import '../utils/pdf_recap_generator.dart';

class TripRecapScreen extends ConsumerWidget {
  final String tripId;

  const TripRecapScreen({super.key, required this.tripId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tripAsync = ref.watch(tripDetailProvider(tripId));
    final expensesAsync = ref.watch(expensesProvider({'trip_id': tripId}));
    final statsAsync = ref.watch(tripLocationStatsProvider(tripId));

    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rekap & Histori Perjalanan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded),
            tooltip: 'Cetak / Unduh PDF',
            onPressed: () async {
              final trip = tripAsync.value;
              final expenses = expensesAsync.value ?? [];
              final stats = statsAsync.value;
              if (trip != null) {
                await PdfRecapGenerator.generateAndPrintPdf(
                  trip: trip,
                  expenses: expenses,
                  stats: stats,
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Data perjalanan belum siap untuk cetak PDF')),
                );
              }
            },
          ),
        ],
      ),
      body: tripAsync.when(
        data: (trip) {
          final expenses = expensesAsync.value ?? [];
          final stats = statsAsync.value;

          final totalBudget = trip.initialBalance;

          final approvedSpent = expenses
              .where((e) => e.isApproved)
              .fold(0.0, (sum, e) => sum + e.amount);

          final pendingSpent = expenses
              .where((e) => e.isPending)
              .fold(0.0, (sum, e) => sum + e.amount);

          final sisaBudget = totalBudget - approvedSpent;
          final totalDistanceKm = stats?.totalDistanceKm ?? 0.0;

          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              16,
              16,
              16,
              32 + MediaQuery.of(context).padding.bottom,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Trip Information Header
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                                  color: AppColors.primary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: trip.status.isCompleted
                                    ? AppColors.success.withOpacity(0.15)
                                    : AppColors.warning.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                trip.status.label.toUpperCase(),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                  color: trip.status.isCompleted ? AppColors.success : AppColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          trip.title,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.person_rounded, size: 16, color: AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              'Petugas: ${trip.officerName ?? 'Petugas Lapangan'}',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_rounded, size: 16, color: AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${trip.startLocation} ➔ ${trip.destination}',
                                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // 2. Budget & Financial Recap Grid Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildSummaryCard(
                        title: 'Total Anggaran',
                        value: currencyFormat.format(totalBudget),
                        icon: Icons.account_balance_wallet_rounded,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildSummaryCard(
                        title: 'Terpakai (Disetujui)',
                        value: currencyFormat.format(approvedSpent),
                        icon: Icons.output_rounded,
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildSummaryCard(
                        title: 'Sisa Anggaran',
                        value: currencyFormat.format(sisaBudget),
                        icon: Icons.monetization_on_rounded,
                        color: sisaBudget >= 0 ? Colors.blue.shade700 : AppColors.error,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildSummaryCard(
                        title: 'Jarak Tempuh GPS',
                        value: '${totalDistanceKm.toStringAsFixed(1)} km',
                        icon: Icons.route_rounded,
                        color: Colors.orange.shade800,
                      ),
                    ),
                  ],
                ),

                if (pendingSpent > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.pending_actions_rounded, color: AppColors.warning, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Pengeluaran Menunggu Approval: ${currencyFormat.format(pendingSpent)}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.warning,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // 3. Receipt & Location Input Timeline
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Histori Input Struk & Lokasi',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    TextButton.icon(
                      icon: const Icon(Icons.map_rounded, size: 16),
                      label: const Text('Lihat di Peta'),
                      onPressed: () {
                        context.push('/tracking/${trip.id}?title=${Uri.encodeComponent(trip.title)}');
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                if (expenses.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.receipt_long_outlined, size: 40, color: AppColors.textMuted),
                        SizedBox(height: 8),
                        Text(
                          'Belum ada struk pengeluaran yang dicatat',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: expenses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final exp = expenses[index];
                      return _buildExpenseTimelineTile(context, exp, currencyFormat);
                    },
                  ),

                const SizedBox(height: 24),

                // 4. Action Buttons (PDF & Live Map)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.print_rounded),
                  label: const Text(
                    'Cetak / Simpan Laporan PDF',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () async {
                    await PdfRecapGenerator.generateAndPrintPdf(
                      trip: trip,
                      expenses: expenses,
                      stats: stats,
                    );
                  },
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Gagal memuat rekap: $err')),
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: color.withOpacity(0.12),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseTimelineTile(
    BuildContext context,
    ExpenseModel expense,
    NumberFormat currencyFormat,
  ) {
    Color statusColor;
    if (expense.isApproved) {
      statusColor = AppColors.success;
    } else if (expense.isRejected) {
      statusColor = AppColors.error;
    } else {
      statusColor = AppColors.warning;
    }

    final dateToDisplay = expense.date ?? expense.createdAt;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.receipt_rounded, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      expense.category,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      currencyFormat.format(expense.amount),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  expense.description ?? 'Struk Pengeluaran',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 12, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('dd/MM/yyyy HH:mm').format(dateToDisplay),
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                    const SizedBox(width: 12),
                    if (expense.latitude != null && expense.longitude != null) ...[
                      const Icon(Icons.location_on_rounded, size: 12, color: AppColors.primary),
                      const SizedBox(width: 2),
                      Text(
                        '${expense.latitude!.toStringAsFixed(4)}, ${expense.longitude!.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              expense.status.label,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
            ),
          ),
        ],
      ),
    );
  }
}
