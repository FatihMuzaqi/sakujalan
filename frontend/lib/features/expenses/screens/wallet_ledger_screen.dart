import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/expense_model.dart';
import '../providers/expense_provider.dart';

class WalletLedgerScreen extends ConsumerStatefulWidget {
  final String? tripId;

  const WalletLedgerScreen({super.key, this.tripId});

  @override
  ConsumerState<WalletLedgerScreen> createState() => _WalletLedgerScreenState();
}

class _WalletLedgerScreenState extends ConsumerState<WalletLedgerScreen> {
  String _typeFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final queryParams = <String, dynamic>{};
    if (widget.tripId != null) queryParams['trip_id'] = widget.tripId;
    if (_typeFilter != 'ALL') queryParams['type'] = _typeFilter;

    final ledgerAsync = ref.watch(walletLedgerProvider(queryParams.isEmpty ? null : queryParams));
    final balanceAsync = widget.tripId != null
        ? ref.watch(tripBalanceProvider(widget.tripId!))
        : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Buku Kas & Mutasi Saldo'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list_rounded),
            tooltip: 'Filter Tipe Transaksi',
            onSelected: (val) => setState(() => _typeFilter = val),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'ALL', child: Text('Semua Transaksi')),
              PopupMenuItem(value: 'INITIAL', child: Text('Alokasi Budget (Kredit)')),
              PopupMenuItem(value: 'EXPENSE', child: Text('Pengeluaran (Debit)')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // If viewing for specific trip, display Trip Balance Card
          if (balanceAsync != null) ...[
            balanceAsync.when(
              data: (summary) {
                if (summary == null) return const SizedBox.shrink();
                return Container(
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, Color(0xFF1E3A8A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            summary.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              summary.tripCode ?? 'TRIP',
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'SISA SALDO BUDGET',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        Formatters.currency(summary.remainingBudget),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 24,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Budget Awal: ${Formatters.currency(summary.initialBalance)}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                          Text(
                            'Terpakai: ${Formatters.currency(summary.totalSpent)}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: summary.initialBalance > 0
                              ? (summary.totalSpent / summary.initialBalance).clamp(0.0, 1.0)
                              : 0.0,
                          backgroundColor: Colors.white24,
                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.amberAccent),
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                );
              },
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],

          // Transaction list
          Expanded(
            child: ledgerAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 8),
                    Text('Gagal memuat mutasi: $err'),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(walletLedgerProvider),
                      child: const Text('Coba Lagi'),
                    ),
                  ],
                ),
              ),
              data: (transactions) {
                if (transactions.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(walletLedgerProvider),
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 120),
                        Center(
                          child: Column(
                            children: [
                              Icon(Icons.receipt_long_outlined, size: 54, color: AppColors.textMuted),
                              SizedBox(height: 12),
                              Text(
                                'Belum ada catatan mutasi transaksi',
                                style: TextStyle(color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(walletLedgerProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: transactions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final tx = transactions[index];
                      return _buildTransactionCard(tx);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(WalletTransactionModel tx) {
    final isCredit = tx.isCredit;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border.withOpacity(0.6)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: isCredit
                  ? AppColors.success.withOpacity(0.12)
                  : AppColors.error.withOpacity(0.12),
              child: Icon(
                isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                color: isCredit ? AppColors.success : AppColors.error,
                size: 20,
              ),
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
                        tx.type.label,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        '${isCredit ? '+' : '-'} ${Formatters.currency(tx.amount)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isCredit ? AppColors.success : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (tx.description != null && tx.description!.isNotEmpty) ...[
                    Text(
                      tx.description!,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                  ],
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Saldo: ${Formatters.currency(tx.balanceBefore)} ➔ ${Formatters.currency(tx.balanceAfter)}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                      Text(
                        '${tx.createdAt.day}/${tx.createdAt.month} ${tx.createdAt.hour}:${tx.createdAt.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
