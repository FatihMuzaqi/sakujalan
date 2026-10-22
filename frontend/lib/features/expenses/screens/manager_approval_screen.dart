import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/expense_model.dart';
import '../providers/expense_provider.dart';
import '../widgets/reject_reason_dialog.dart';

class ManagerApprovalScreen extends ConsumerWidget {
  const ManagerApprovalScreen({super.key});

  void _handleApprove(BuildContext context, WidgetRef ref, String id, String category, double amount) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setujui Pengeluaran?'),
        content: Text(
          'Setujui pengeluaran $category sebesar ${Formatters.currency(amount)}? Saldo budget perjalanan dinas akan otomatis dipotong.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Setujui'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await ref.read(expenseActionProvider.notifier).approveExpense(id);
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text('✅ Pengeluaran disetujui & saldo wallet terpotong'),
          ),
        );
      }
    }
  }

  void _handleReject(BuildContext context, WidgetRef ref, String id, String title) {
    showDialog(
      context: context,
      builder: (ctx) => RejectReasonDialog(
        expenseTitle: title,
        onConfirm: (reason) async {
          final success = await ref.read(expenseActionProvider.notifier).rejectExpense(id, reason);
          if (success && context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                backgroundColor: AppColors.error,
                content: Text('❌ Pengeluaran ditolak'),
              ),
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingAsync = ref.watch(pendingExpensesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Antrean Approval Pengeluaran'),
      ),
      body: pendingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 8),
              Text('Gagal memuat antrean: $err'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.invalidate(pendingExpensesProvider),
                child: const Text('Muat Ulang'),
              ),
            ],
          ),
        ),
        data: (expenses) {
          if (expenses.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(pendingExpensesProvider),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 140),
                  Center(
                    child: Column(
                      children: [
                        Icon(Icons.task_alt_rounded, size: 60, color: AppColors.success),
                        SizedBox(height: 14),
                        Text(
                          'Semua Bersih!',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Tidak ada pengeluaran yang menunggu persetujuan',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(pendingExpensesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: expenses.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final expense = expenses[index];
                return _buildApprovalCard(context, ref, expense);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildApprovalCard(BuildContext context, WidgetRef ref, ExpenseModel expense) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                      child: const Icon(Icons.person_rounded, size: 16, color: AppColors.primary),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      expense.officerName ?? 'Officer',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'PENDING',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.amber.shade900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      expense.category,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      expense.tripTitle ?? expense.tripCode ?? '-',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
                Text(
                  Formatters.currency(expense.amount),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            if (expense.description != null && expense.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Catatan: ${expense.description}',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: () => _handleReject(context, ref, expense.id, expense.category),
                    icon: const Icon(Icons.close_rounded, size: 16),
                    label: const Text('Tolak'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: () => _handleApprove(context, ref, expense.id, expense.category, expense.amount),
                    icon: const Icon(Icons.check_rounded, size: 16),
                    label: const Text('Setujui'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
