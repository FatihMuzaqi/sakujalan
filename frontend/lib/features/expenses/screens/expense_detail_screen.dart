import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_enums.dart';
import '../../../core/utils/formatters.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/expense_provider.dart';
import '../widgets/reject_reason_dialog.dart';

class ExpenseDetailScreen extends ConsumerWidget {
  final String expenseId;

  const ExpenseDetailScreen({super.key, required this.expenseId});

  Color _getStatusColor(ExpenseStatus status) {
    switch (status) {
      case ExpenseStatus.draft:
        return Colors.grey;
      case ExpenseStatus.pending:
        return Colors.amber.shade700;
      case ExpenseStatus.approved:
        return AppColors.success;
      case ExpenseStatus.rejected:
        return AppColors.error;
    }
  }

  void _handleApprove(BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Setujui Pengeluaran?'),
        content: const Text(
          'Saldo budget perjalanan dinas akan otomatis dipotong sesuai nominal pengeluaran ini.',
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
      final success = await ref.read(expenseActionProvider.notifier).approveExpense(expenseId);
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text('✅ Pengeluaran berhasil disetujui & saldo wallet terpotong'),
          ),
        );
      }
    }
  }

  void _handleReject(BuildContext context, WidgetRef ref, String title) async {
    showDialog(
      context: context,
      builder: (ctx) => RejectReasonDialog(
        expenseTitle: title,
        onConfirm: (reason) async {
          final success = await ref.read(expenseActionProvider.notifier).rejectExpense(expenseId, reason);
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

  void _handleSubmitDraft(BuildContext context, WidgetRef ref) async {
    final success = await ref.read(expenseActionProvider.notifier).submitExpense(expenseId);
    if (success && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('🚀 Pengeluaran berhasil dikirim untuk persetujuan'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expenseAsync = ref.watch(expenseDetailProvider(expenseId));
    final authState = ref.watch(authProvider);
    final userRole = authState.user?.role.toUpperCase();
    final isManagerOrAbove = userRole == 'MANAGER' ||
        userRole == 'ADMIN' ||
        userRole == 'OWNER';
    final actionState = ref.watch(expenseActionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Pengeluaran'),
      ),
      body: expenseAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 8),
              Text('Gagal memuat detail: $err'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.invalidate(expenseDetailProvider(expenseId)),
                child: const Text('Muat Ulang'),
              ),
            ],
          ),
        ),
        data: (expense) {
          if (expense == null) {
            return const Center(child: Text('Data pengeluaran tidak ditemukan'));
          }

          final statusColor = _getStatusColor(expense.status);

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
                // Status Header Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        expense.isApproved
                            ? Icons.check_circle_rounded
                            : expense.isRejected
                                ? Icons.cancel_rounded
                                : expense.isPending
                                    ? Icons.hourglass_top_rounded
                                    : Icons.edit_note_rounded,
                        color: statusColor,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Status: ${expense.status.label}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: statusColor,
                              ),
                            ),
                            if (expense.rejectionReason != null && expense.rejectionReason!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Alasan Penolakan: ${expense.rejectionReason}',
                                style: const TextStyle(color: AppColors.error, fontSize: 13),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Main Info Card
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'TOTAL NOMINAL',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.currency(expense.amount),
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 16),
                        _buildDetailRow('Kategori', expense.category),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          'Perjalanan Dinas',
                          expense.tripTitle ?? expense.tripCode ?? '-',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow('Officer', expense.officerName ?? '-'),
                        const SizedBox(height: 12),
                        _buildDetailRow('Metode Input', expense.inputMethod.label),
                        if (expense.ocrConfidence != null) ...[
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            'AI Confidence',
                            '${(expense.ocrConfidence! * 100).toStringAsFixed(0)}%',
                          ),
                        ],
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          'Tanggal',
                          expense.date != null
                              ? '${expense.date!.day}/${expense.date!.month}/${expense.date!.year}'
                              : '-',
                        ),
                        if (expense.description != null && expense.description!.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _buildDetailRow('Keterangan', expense.description!),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Receipt Image Card (if any)
                if (expense.receiptUrl != null && expense.receiptUrl!.isNotEmpty) ...[
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.image_outlined, size: 18, color: AppColors.primary),
                              SizedBox(width: 8),
                              Text(
                                'Foto Struk / Bukti Transaksi',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              expense.receiptUrl!,
                              height: 200,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 120,
                                color: Colors.grey.shade100,
                                alignment: Alignment.center,
                                child: const Text(
                                  'Gambar struk tersimpan',
                                  style: TextStyle(color: AppColors.textSecondary),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Approval Audit Trail History
                if (expense.approvals.isNotEmpty) ...[
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.history_edu_rounded, size: 18, color: AppColors.primary),
                              SizedBox(width: 8),
                              Text(
                                'Riwayat Audit Persetujuan',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ...expense.approvals.map((audit) {
                            final isAppr = audit.action.toUpperCase() == 'APPROVED';
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: CircleAvatar(
                                radius: 16,
                                backgroundColor: isAppr
                                    ? AppColors.success.withOpacity(0.15)
                                    : AppColors.error.withOpacity(0.15),
                                child: Icon(
                                  isAppr ? Icons.check : Icons.close,
                                  size: 16,
                                  color: isAppr ? AppColors.success : AppColors.error,
                                ),
                              ),
                              title: Text(
                                '${audit.action} oleh ${audit.approverName ?? 'Manager'}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              subtitle: audit.rejectionReason != null
                                  ? Text(
                                      'Alasan: ${audit.rejectionReason}',
                                      style: const TextStyle(fontSize: 12, color: AppColors.error),
                                    )
                                  : Text(
                                      '${audit.createdAt.day}/${audit.createdAt.month}/${audit.createdAt.year} ${audit.createdAt.hour}:${audit.createdAt.minute.toString().padLeft(2, '0')}',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Action Buttons Bottom
                if (expense.isDraft) ...[
                  ElevatedButton.icon(
                    onPressed: actionState.isLoading ? null : () => _handleSubmitDraft(context, ref),
                    icon: const Icon(Icons.send_rounded),
                    label: const Text('Kirim untuk Persetujuan Manajer'),
                  ),
                ] else if (expense.isPending && isManagerOrAbove) ...[
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                            side: const BorderSide(color: AppColors.error),
                          ),
                          onPressed: actionState.isLoading
                              ? null
                              : () => _handleReject(context, ref, expense.category),
                          icon: const Icon(Icons.close_rounded),
                          label: const Text('Tolak'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                          ),
                          onPressed: actionState.isLoading ? null : () => _handleApprove(context, ref),
                          icon: const Icon(Icons.check_circle_outline_rounded),
                          label: const Text('Setujui & Potong Saldo'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    );
  }
}
