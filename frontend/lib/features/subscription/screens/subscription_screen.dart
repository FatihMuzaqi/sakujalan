import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../providers/subscription_provider.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subAsync = ref.watch(subscriptionStatusProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Status & Langganan SaaS', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Riwayat Pembayaran',
            onPressed: () => context.push('/subscription/history'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Segarkan',
            onPressed: () => ref.read(subscriptionStatusProvider.notifier).refresh(),
          ),
        ],
      ),
      body: subAsync.when(
        data: (data) {
          final statusInfo = data.statusInfo;
          final isTrial = statusInfo.status == 'TRIAL';
          final isActive = statusInfo.status == 'ACTIVE';
          final isExpired = statusInfo.status == 'EXPIRED';
          final plan = data.plan;
          final planPrice = plan != null ? currencyFormatter.format(plan.price) : 'Rp 50.000';

          return RefreshIndicator(
            onRefresh: () => ref.read(subscriptionStatusProvider.notifier).refresh(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                32 + MediaQuery.of(context).padding.bottom,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. STATUS HERO CARD
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isExpired
                            ? AppColors.error.withOpacity(0.3)
                            : (isActive ? AppColors.success.withOpacity(0.3) : AppColors.primary.withOpacity(0.3)),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: (isExpired
                                    ? AppColors.error
                                    : (isActive ? AppColors.success : AppColors.primary))
                                .withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isExpired
                                ? Icons.warning_amber_rounded
                                : (isActive ? Icons.verified_rounded : Icons.timer_outlined),
                            size: 40,
                            color: isExpired
                                ? AppColors.error
                                : (isActive ? AppColors.success : AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          isTrial
                              ? 'Trial tersisa ${statusInfo.daysRemaining} hari'
                              : (isActive
                                  ? 'Langganan Aktif (${statusInfo.daysRemaining} hari tersisa)'
                                  : 'Masa Aktif Berakhir (Read-Only)'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isExpired
                                ? AppColors.error
                                : (isActive ? AppColors.success : AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          isExpired
                              ? 'Masa trial atau langganan Anda telah berakhir. Anda masih dapat melihat data histori, namun pembuatan data baru dibatasi.'
                              : (isTrial
                                  ? 'Anda sedang menikmati uji coba gratis 30 hari dengan akses operasional penuh.'
                                  : 'Akun Anda memiliki akses penuh seluruh fitur operasional dan realtime tracking.'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        if (isExpired) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.error.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Mode: READ-ONLY',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.error),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 2. PLAN DETAILS CARD
                  const Text(
                    'Paket Langganan TripEx',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              plan?.name ?? 'TripEx PRO Monthly',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$planPrice / bln',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(height: 1, color: AppColors.border),
                        const SizedBox(height: 14),
                        _buildFeatureItem('Multi-user tenant & Role-based Access (Owner, Admin, Manager, Officer)'),
                        _buildFeatureItem('Realtime GPS Tracking & Live Monitoring Radar'),
                        _buildFeatureItem('AI Receipt OCR Scanner & Auto Merchant Extraction'),
                        _buildFeatureItem('Expense Approval Workflow & Financial Wallet Ledger'),
                        _buildFeatureItem('Multi-platform Flutter Mobile & Web Dashboard'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // 3. CTA BUTTONS
                  SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isExpired ? AppColors.error : AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => context.push('/subscription/checkout'),
                      icon: const Icon(Icons.payment_rounded),
                      label: Text(
                        isExpired ? 'Bayar Sekarang ($planPrice)' : 'Perpanjang Langganan ($planPrice)',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => context.push('/subscription/history'),
                    icon: const Icon(Icons.receipt_long_rounded, size: 18),
                    label: const Text('Lihat Riwayat Transaksi & Invoice'),
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
                onPressed: () => ref.read(subscriptionStatusProvider.notifier).refresh(),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.success),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 12, color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}
