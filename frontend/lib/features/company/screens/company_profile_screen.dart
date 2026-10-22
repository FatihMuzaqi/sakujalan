import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/company_provider.dart';

class CompanyProfileScreen extends ConsumerStatefulWidget {
  const CompanyProfileScreen({super.key});

  @override
  ConsumerState<CompanyProfileScreen> createState() => _CompanyProfileScreenState();
}

class _CompanyProfileScreenState extends ConsumerState<CompanyProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  bool _isInitialized = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(companyActionProvider.notifier).updateCompanyProfile(
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil perusahaan berhasil disimpan')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final companyAsync = ref.watch(companyProfileProvider);
    final user = ref.watch(authProvider).user;
    final isManagerOrAbove = user?.role == 'OWNER' || user?.role == 'ADMIN';
    final actionState = ref.watch(companyActionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil Perusahaan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.people_alt_rounded),
            tooltip: 'Kelola Anggota',
            onPressed: () => context.push('/company/members'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Keluar',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: companyAsync.when(
        data: (profile) {
          if (!_isInitialized) {
            _nameController.text = profile.company.name;
            _phoneController.text = profile.company.phone ?? '';
            _addressController.text = profile.company.address ?? '';
            _isInitialized = true;
          }

          final status = profile.subscriptionStatus;
          final isTrial = status == 'TRIAL';
          final isExpired = status == 'EXPIRED';

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(companyProfileProvider),
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                16.0,
                16.0,
                16.0,
                32.0 + MediaQuery.of(context).padding.bottom,
              ),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Subscription Banner Card
                    AppCard(
                      backgroundColor: isExpired
                          ? AppColors.error.withOpacity(0.08)
                          : isTrial
                              ? AppColors.warning.withOpacity(0.08)
                              : AppColors.primary.withOpacity(0.08),
                      child: Row(
                        children: [
                          Icon(
                            isExpired
                                ? Icons.warning_amber_rounded
                                : isTrial
                                    ? Icons.timer_outlined
                                    : Icons.verified_rounded,
                            size: 36,
                            color: isExpired
                                ? AppColors.error
                                : isTrial
                                    ? AppColors.warning
                                    : AppColors.primary,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Status SaaS: $status',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: isExpired
                                        ? AppColors.error
                                        : isTrial
                                            ? AppColors.warning
                                            : AppColors.primary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isTrial
                                      ? 'Masa Trial tersisa ${profile.daysRemaining} hari'
                                      : isExpired
                                          ? 'Langganan berakhir. Mode Read-Only.'
                                          : 'Langganan aktif (${profile.daysRemaining} hari tersisa)',
                                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push('/subscription'),
                            child: const Text('Kelola'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Quick Members Navigation Tile
                    AppCard(
                      onTap: () => context.push('/company/members'),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.people_outline_rounded, color: AppColors.primary, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Daftar Anggota & Pegawai',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Text(
                                  '${profile.company.totalMembers} Anggota terdaftar',
                                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: AppColors.textMuted),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Company Details Form
                    const Text(
                      'Informasi Perusahaan',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    AppTextField(
                      label: 'Nama Perusahaan',
                      controller: _nameController,
                      enabled: isManagerOrAbove,
                      validator: (val) => (val == null || val.trim().isEmpty) ? 'Nama perusahaan wajib diisi' : null,
                    ),
                    const SizedBox(height: 14),

                    AppTextField(
                      label: 'Email Perusahaan',
                      controller: TextEditingController(text: profile.company.email),
                      enabled: false,
                    ),
                    const SizedBox(height: 14),

                    AppTextField(
                      label: 'No. Telepon Perusahaan',
                      controller: _phoneController,
                      enabled: isManagerOrAbove,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 14),

                    AppTextField(
                      label: 'Alamat Kantor',
                      controller: _addressController,
                      enabled: isManagerOrAbove,
                      maxLines: 3,
                    ),
                    const SizedBox(height: 24),

                    if (isManagerOrAbove)
                      AppButton(
                        text: 'Simpan Perubahan',
                        isLoading: actionState.isLoading,
                        onPressed: _handleSave,
                      ),
                  ],
                ),
              ),
            ),
          );
        },
        loading: () => const LoadingView(message: 'Memuat data perusahaan...'),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Error: $err', style: const TextStyle(color: AppColors.error)),
              const SizedBox(height: 12),
              AppButton(
                text: 'Coba Lagi',
                isFullWidth: false,
                onPressed: () => ref.refresh(companyProfileProvider),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
