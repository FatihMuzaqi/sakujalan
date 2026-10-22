import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../company/providers/company_provider.dart';
import '../providers/trip_provider.dart';

class AssignOfficerDialog extends ConsumerStatefulWidget {
  final String tripId;
  final String? currentOfficerId;

  const AssignOfficerDialog({
    super.key,
    required this.tripId,
    this.currentOfficerId,
  });

  @override
  ConsumerState<AssignOfficerDialog> createState() => _AssignOfficerDialogState();
}

class _AssignOfficerDialogState extends ConsumerState<AssignOfficerDialog> {
  String? _selectedOfficerId;

  @override
  void initState() {
    super.initState();
    _selectedOfficerId = widget.currentOfficerId;
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(companyMembersProvider);
    final actionState = ref.watch(tripActionProvider);

    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.person_pin_rounded, color: AppColors.primary),
          SizedBox(width: 8),
          Text('Tugaskan Petugas', style: TextStyle(fontSize: 18)),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: membersAsync.when(
          data: (members) {
            final officers = members.where((m) => m.isActive).toList();
            if (officers.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text('Tidak ada anggota aktif yang tersedia.'),
                ),
              );
            }

            return ListView.builder(
              shrinkWrap: true,
              itemCount: officers.length,
              itemBuilder: (context, index) {
                final member = officers[index];
                final isSelected = _selectedOfficerId == member.userId;
                return ListTile(
                  title: Text(
                    member.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text('${member.role.value} • ${member.email}'),
                  trailing: Icon(
                    isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: isSelected ? AppColors.primary : AppColors.textMuted,
                  ),
                  selected: isSelected,
                  onTap: () {
                    setState(() {
                      _selectedOfficerId = member.userId;
                    });
                  },
                );
              },
            );
          },
          loading: () => const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (err, _) => Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Gagal memuat anggota: $err',
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: actionState.isLoading ? null : () => Navigator.of(context).pop(false),
          child: const Text('Batal'),
        ),
        ElevatedButton(
          onPressed: (_selectedOfficerId == null || actionState.isLoading)
              ? null
              : () async {
                  final success = await ref
                      .read(tripActionProvider.notifier)
                      .assignOfficer(widget.tripId, _selectedOfficerId!);

                  if (context.mounted) {
                    if (success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Petugas berhasil ditugaskan!'),
                          backgroundColor: AppColors.success,
                        ),
                      );
                      Navigator.of(context).pop(true);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            actionState.error ?? 'Gagal menugaskan petugas',
                          ),
                          backgroundColor: AppColors.error,
                        ),
                      );
                    }
                  }
                },
          child: actionState.isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Tugaskan'),
        ),
      ],
    );
  }
}
