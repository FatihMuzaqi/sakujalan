import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_enums.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/member_model.dart';
import '../providers/company_provider.dart';
import '../widgets/add_member_dialog.dart';
import '../widgets/edit_member_dialog.dart';

class MemberListScreen extends ConsumerStatefulWidget {
  const MemberListScreen({super.key});

  @override
  ConsumerState<MemberListScreen> createState() => _MemberListScreenState();
}

class _MemberListScreenState extends ConsumerState<MemberListScreen> {
  String _searchQuery = '';
  String? _selectedRoleFilter;

  void _showAddMemberDialog() {
    showDialog(
      context: context,
      builder: (ctx) => const AddMemberDialog(),
    );
  }

  void _showEditMemberDialog(MemberModel member) {
    showDialog(
      context: context,
      builder: (ctx) => EditMemberDialog(member: member),
    );
  }

  void _confirmDeleteMember(MemberModel member) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Anggota'),
        content: Text('Apakah Anda yakin ingin menghapus "${member.name}" dari perusahaan?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              Navigator.of(ctx).pop();
              final success = await ref.read(companyActionProvider.notifier).deleteMember(member.id);
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Anggota berhasil dihapus')),
                );
              }
            },
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }

  Color _getRoleColor(UserRole role) {
    switch (role) {
      case UserRole.owner:
        return AppColors.accent;
      case UserRole.admin:
        return AppColors.primary;
      case UserRole.manager:
        return AppColors.secondary;
      case UserRole.officer:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(companyMembersProvider);
    final user = ref.watch(authProvider).user;
    final isManagerOrAbove = user?.role == 'OWNER' || user?.role == 'ADMIN';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daftar Anggota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.refresh(companyMembersProvider),
          ),
        ],
      ),
      floatingActionButton: isManagerOrAbove
          ? FloatingActionButton.extended(
              onPressed: _showAddMemberDialog,
              icon: const Icon(Icons.person_add_rounded),
              label: const Text('Tambah Anggota'),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            )
          : null,
      body: membersAsync.when(
        data: (members) {
          final filtered = members.where((m) {
            final matchesQuery = m.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                m.email.toLowerCase().contains(_searchQuery.toLowerCase());
            final matchesRole = _selectedRoleFilter == null || m.role.value == _selectedRoleFilter;
            return matchesQuery && matchesRole;
          }).toList();

          return Column(
            children: [
              // Search & Filter Bar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Cari nama atau email...',
                          prefixIcon: const Icon(Icons.search_rounded, size: 20),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                        ),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    PopupMenuButton<String?>(
                      icon: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: _selectedRoleFilter != null ? AppColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Icon(
                          Icons.filter_list_rounded,
                          size: 20,
                          color: _selectedRoleFilter != null ? Colors.white : AppColors.textPrimary,
                        ),
                      ),
                      onSelected: (val) {
                        setState(() {
                          _selectedRoleFilter = val;
                        });
                      },
                      itemBuilder: (ctx) => [
                        const PopupMenuItem(value: null, child: Text('Semua Peran')),
                        const PopupMenuItem(value: 'OWNER', child: Text('OWNER')),
                        const PopupMenuItem(value: 'ADMIN', child: Text('ADMIN')),
                        const PopupMenuItem(value: 'MANAGER', child: Text('MANAGER')),
                        const PopupMenuItem(value: 'OFFICER', child: Text('OFFICER')),
                      ],
                    ),
                  ],
                ),
              ),

              // Members List View
              Expanded(
                child: filtered.isEmpty
                    ? EmptyStateView(
                        icon: Icons.person_off_outlined,
                        title: 'Tidak Ada Anggota',
                        description: _searchQuery.isNotEmpty
                            ? 'Tidak ada anggota yang cocok dengan pencarian "$_searchQuery"'
                            : 'Belum ada anggota terdaftar dalam perusahaan ini.',
                        buttonText: isManagerOrAbove ? 'Tambah Anggota' : null,
                        onButtonPressed: isManagerOrAbove ? _showAddMemberDialog : null,
                      )
                    : RefreshIndicator(
                        onRefresh: () async => ref.refresh(companyMembersProvider),
                        child: ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                            16,
                            8,
                            16,
                            (isManagerOrAbove ? 80 : 24) + MediaQuery.of(context).padding.bottom,
                          ),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final member = filtered[index];
                            final roleColor = _getRoleColor(member.role);
                            final isSelf = user?.id == member.userId;

                            return AppCard(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  // Avatar Initials
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: roleColor.withOpacity(0.15),
                                    child: Text(
                                      member.name.isNotEmpty ? member.name[0].toUpperCase() : '?',
                                      style: TextStyle(
                                        color: roleColor,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  // Details
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                member.name,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 15,
                                                  color: AppColors.textPrimary,
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            if (isSelf) ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text(
                                                  'Anda',
                                                  style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w600),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          member.email,
                                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            // Role Badge
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: roleColor.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                member.role.value,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                  color: roleColor,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            // Status Badge
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: member.status == 'ACTIVE'
                                                    ? AppColors.success.withOpacity(0.1)
                                                    : AppColors.error.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                member.status,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: member.status == 'ACTIVE'
                                                      ? AppColors.success
                                                      : AppColors.error,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Actions
                                  if (isManagerOrAbove && member.role != UserRole.owner) ...[
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert_rounded, color: AppColors.textSecondary),
                                      onSelected: (val) {
                                        if (val == 'edit') {
                                          _showEditMemberDialog(member);
                                        } else if (val == 'delete') {
                                          _confirmDeleteMember(member);
                                        }
                                      },
                                      itemBuilder: (ctx) => [
                                        const PopupMenuItem(
                                          value: 'edit',
                                          child: Row(
                                            children: [
                                              Icon(Icons.edit_outlined, size: 18),
                                              SizedBox(width: 8),
                                              Text('Ubah Peran / Status'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                              SizedBox(width: 8),
                                              Text('Hapus Anggota', style: TextStyle(color: AppColors.error)),
                                            ],
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
                      ),
              ),
            ],
          );
        },
        loading: () => const LoadingView(message: 'Memuat daftar anggota...'),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Error: $err', style: const TextStyle(color: AppColors.error)),
              const SizedBox(height: 12),
              AppButton(
                text: 'Coba Lagi',
                isFullWidth: false,
                onPressed: () => ref.refresh(companyMembersProvider),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
