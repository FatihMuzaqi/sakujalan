import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/config/app_config.dart';
import '../models/subscription_model.dart';
import '../providers/subscription_provider.dart';

class SubscriptionCheckoutScreen extends ConsumerStatefulWidget {
  const SubscriptionCheckoutScreen({super.key});

  @override
  ConsumerState<SubscriptionCheckoutScreen> createState() => _SubscriptionCheckoutScreenState();
}

class _SubscriptionCheckoutScreenState extends ConsumerState<SubscriptionCheckoutScreen> {
  String _selectedMethod = 'QRIS';
  bool _isLoading = false;

  final currencyFormatter = NumberFormat.currency(symbol: 'Rp ', decimalDigits: 0);

  Future<void> _processCheckout(double planPrice, String planCode) async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(subscriptionRepositoryProvider);
      final result = await repo.checkout(
        paymentMethod: _selectedMethod,
        gateway: 'MIDTRANS',
        planCode: planCode,
      );

      if (mounted) {
        _showPaymentModal(result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membuat invoice: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showPaymentModal(CheckoutResponseModel checkout) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            20,
            20,
            24 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.payment_rounded, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Text('Tagihan Pembayaran', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Invoice Details Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    _buildRow('No. Invoice', checkout.invoiceNumber),
                    const SizedBox(height: 8),
                    _buildRow('Paket Langganan', checkout.planName),
                    const SizedBox(height: 8),
                    _buildRow('Metode', checkout.paymentMethod),
                    const SizedBox(height: 8),
                    _buildRow('Gateway', AppConfig.midtransIsProduction ? 'Midtrans Snap (Production)' : 'Midtrans Snap (Sandbox)', isBold: false),
                    const SizedBox(height: 10),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 10),
                    _buildRow('Total Tagihan', currencyFormatter.format(checkout.amount), isBold: true),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Info Banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_outlined, color: AppColors.primary, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Pembayaran diproses secara aman oleh Midtrans. Masa aktif langganan akan otomatis bertambah setelah transaksi selesai.',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Primary Midtrans Snap Launch Button
              if (checkout.paymentUrl.isNotEmpty) ...[
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 2,
                    ),
                    icon: const Icon(Icons.open_in_browser_rounded),
                    label: const Text(
                      'Buka Pembayaran Midtrans Snap',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    onPressed: () async {
                      final uri = Uri.parse(checkout.paymentUrl);
                      try {
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } else {
                          await launchUrl(uri);
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Tidak dapat membuka link: $e'), backgroundColor: AppColors.error),
                          );
                        }
                      }
                    },
                  ),
                ),
                const SizedBox(height: 8),

                // Copy Link Button
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.copy_rounded, size: 16),
                  label: const Text('Salin Link Pembayaran', style: TextStyle(fontSize: 13)),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: checkout.paymentUrl));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Link pembayaran disalin ke clipboard!')),
                    );
                  },
                ),
                const SizedBox(height: 8),
              ],

              // Verify & Refresh Button
              TextButton.icon(
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Sudah Membayar? Cek Status Langganan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    await ref.read(subscriptionRepositoryProvider).syncPayment(invoiceNumber: checkout.invoiceNumber);
                  } catch (_) {}
                  await ref.read(subscriptionStatusProvider.notifier).refresh();
                  final refreshed = ref.read(subscriptionStatusProvider);
                  refreshed.whenData((data) {
                    if (data.statusInfo.isActive && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('✅ Pembayaran terkonfirmasi! Langganan Anda telah aktif.'),
                          backgroundColor: AppColors.success,
                        ),
                      );
                      context.pop();
                    } else if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Status pembayaran masih menunggu. Silakan selesaikan pembayaran di Midtrans.')),
                      );
                    }
                  });
                },
              ),

              // Developer Simulation Fallback
              const Divider(height: 16, color: AppColors.border),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: AppColors.textMuted),
                icon: const Icon(Icons.bug_report_outlined, size: 14),
                label: const Text('Simulasikan Pembayaran Sukses (Dev)', style: TextStyle(fontSize: 11)),
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    await ref.read(subscriptionRepositoryProvider).simulatePayment(checkout.invoiceNumber);
                    await ref.read(subscriptionStatusProvider.notifier).refresh();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('✅ Pembayaran simulasi berhasil! Langganan aktif.'),
                          backgroundColor: AppColors.success,
                        ),
                      );
                      context.pop();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Simulasi gagal: $e'), backgroundColor: AppColors.error),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: isBold ? AppColors.primary : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final subAsync = ref.watch(subscriptionStatusProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Checkout Langganan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Perbarui Data Tarif',
            onPressed: () => ref.read(subscriptionStatusProvider.notifier).refresh(),
          ),
        ],
      ),
      body: subAsync.when(
        data: (data) {
          final plan = data.statusInfo.plan ?? data.plan;
          final planName = plan?.name ?? 'TripEx PRO Monthly';
          final planPrice = plan?.price ?? 50000.0;
          final planCode = plan?.code ?? 'MONTHLY';

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
                // 1. ORDER SUMMARY CARD (DYNAMIC PRICING)
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
                          const Text('Ringkasan Pembelian', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              planCode,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(planName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                const Text('30 Hari Akses Operasional Penuh', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          Text(
                            currencyFormatter.format(planPrice),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: AppColors.border),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Tagihan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(
                            currencyFormatter.format(planPrice),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 2. PAYMENT METHODS SELECTOR
                const Text('Pilih Metode Pembayaran', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),

                _buildPaymentMethodOption(
                  id: 'QRIS',
                  title: 'QRIS (Semua E-Wallet & Mobile Banking)',
                  subtitle: 'BCA, Mandiri, GoPay, OVO, ShopeePay, DANA',
                  icon: Icons.qr_code_scanner_rounded,
                ),
                const SizedBox(height: 8),
                _buildPaymentMethodOption(
                  id: 'VIRTUAL_ACCOUNT',
                  title: 'Virtual Account Bank',
                  subtitle: 'BCA, Mandiri, BNI, BRI, Permata',
                  icon: Icons.account_balance_rounded,
                ),
                const SizedBox(height: 8),
                _buildPaymentMethodOption(
                  id: 'CREDIT_CARD',
                  title: 'Kartu Kredit / Debit',
                  subtitle: 'Visa, Mastercard, JCB',
                  icon: Icons.credit_card_rounded,
                ),

                const SizedBox(height: 24),

                // 3. CHECKOUT BUTTON
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _isLoading ? null : () => _processCheckout(planPrice, planCode),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text(
                            'Lanjutkan Pembayaran (${currencyFormatter.format(planPrice)})',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Gagal memuat tarif paket: $err', style: const TextStyle(color: AppColors.error)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.read(subscriptionStatusProvider.notifier).refresh(),
                child: const Text('Muat Ulang'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentMethodOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _selectedMethod == id;

    return InkWell(
      onTap: () => setState(() => _selectedMethod = id),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.textMuted, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontSize: 13, fontWeight: isSelected ? FontWeight.bold : FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
            // ignore: deprecated_member_use
            Radio<String>(
              value: id,
              // ignore: deprecated_member_use
              groupValue: _selectedMethod,
              // ignore: deprecated_member_use
              onChanged: (val) {
                if (val != null) setState(() => _selectedMethod = val);
              },
            ),
          ],
        ),
      ),
    );
  }
}
