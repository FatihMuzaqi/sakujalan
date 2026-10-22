import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../providers/subscription_provider.dart';

class SubscriptionExpiredScreen extends ConsumerWidget {
  const SubscriptionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subAsync = ref.watch(subscriptionStatusProvider);
    final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);

    final plan = subAsync.valueOrNull?.statusInfo.plan ?? subAsync.valueOrNull?.plan;
    final planName = plan?.name ?? 'TripEx PRO Monthly';
    final planPrice = plan != null ? currencyFormatter.format(plan.price) : 'Rp 50.000';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Masa Langganan Berakhir', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_clock_rounded,
                size: 64,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Masa trial Anda telah berakhir.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Akun perusahaan Anda saat ini berada dalam mode Read-Only. Anda tetap dapat melihat seluruh riwayat perjalanan dan laporan pengeluaran, tetapi pembuatan transaksi baru ditangguhkan hingga pembayaran diselesaikan.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Text(planName, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  const SizedBox(height: 4),
                  Text(
                    '$planPrice / bulan',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => context.push('/subscription/checkout'),
                icon: const Icon(Icons.payment_rounded),
                label: Text('Bayar Sekarang ($planPrice)', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => context.go('/dashboard'),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Kembali ke Dashboard (Read-Only)'),
            ),
          ],
        ),
      ),
    );
  }
}
