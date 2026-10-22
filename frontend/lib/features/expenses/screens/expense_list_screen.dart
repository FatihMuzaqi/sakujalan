import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_enums.dart';
import '../../../core/utils/formatters.dart';
import '../models/expense_model.dart';
import '../providers/expense_provider.dart';

class ExpenseListScreen extends ConsumerStatefulWidget {
  const ExpenseListScreen({super.key});

  @override
  ConsumerState<ExpenseListScreen> createState() => _ExpenseListScreenState();
}

class _ExpenseListScreenState extends ConsumerState<ExpenseListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<String> _tabs = ['Semua', 'Draft', 'Menunggu', 'Disetujui', 'Ditolak'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  String? _getStatusFilter(int tabIndex) {
    switch (tabIndex) {
      case 1:
        return 'DRAFT';
      case 2:
        return 'PENDING';
      case 3:
        return 'APPROVED';
      case 4:
        return 'REJECTED';
      default:
        return null;
    }
  }

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

  IconData _getCategoryIcon(String category) {
    switch (category.toUpperCase()) {
      case 'FUEL':
        return Icons.local_gas_station_rounded;
      case 'MEALS':
        return Icons.restaurant_rounded;
      case 'TOLL':
        return Icons.toll_rounded;
      case 'ACCOMMODATION':
        return Icons.hotel_rounded;
      case 'TRANSPORT':
        return Icons.directions_bus_rounded;
      case 'MAINTENANCE':
        return Icons.build_rounded;
      default:
        return Icons.receipt_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daftar Pengeluaran'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            tooltip: 'Mutasi Wallet',
            onPressed: () => context.push('/wallet/ledger'),
          ),
          IconButton(
            icon: const Icon(Icons.rule_rounded),
            tooltip: 'Antrean Approval',
            onPressed: () => context.push('/expenses/pending'),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
          onTap: (_) => setState(() {}),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Cari deskripsi / kategori...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
            ),
          ),
          Expanded(
            child: Consumer(
              builder: (context, ref, child) {
                final statusFilter = _getStatusFilter(_tabController.index);
                final queryParams = <String, dynamic>{};
                if (statusFilter != null) queryParams['status'] = statusFilter;
                if (_searchQuery.isNotEmpty) queryParams['search'] = _searchQuery;

                final expensesAsync = ref.watch(expensesProvider(queryParams.isEmpty ? null : queryParams));

                return expensesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                        const SizedBox(height: 8),
                        Text('Gagal memuat data: $err'),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => ref.invalidate(expensesProvider),
                          child: const Text('Coba Lagi'),
                        ),
                      ],
                    ),
                  ),
                  data: (expenses) {
                    if (expenses.isEmpty) {
                      return RefreshIndicator(
                        onRefresh: () async => ref.invalidate(expensesProvider),
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
                                    'Belum ada pengeluaran yang dicatat',
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
                      onRefresh: () async => ref.invalidate(expensesProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: expenses.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final expense = expenses[index];
                          return _buildExpenseCard(context, expense);
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/expenses/add'),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Catat Biaya'),
      ),
    );
  }

  Widget _buildExpenseCard(BuildContext context, ExpenseModel expense) {
    final statusColor = _getStatusColor(expense.status);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border.withOpacity(0.6)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/expenses/${expense.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: Icon(
                      _getCategoryIcon(expense.category),
                      color: AppColors.primary,
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
                              expense.category,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            Text(
                              Formatters.currency(expense.amount),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          expense.description ?? expense.tripTitle ?? 'Tanpa keterangan',
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        expense.inputMethod == InputMethod.receiptScan
                            ? Icons.document_scanner_outlined
                            : Icons.edit_note_outlined,
                        size: 14,
                        color: AppColors.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        expense.inputMethod.label,
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Text(
                      expense.status.label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
