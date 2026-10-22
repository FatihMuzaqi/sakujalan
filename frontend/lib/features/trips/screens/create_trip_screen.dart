import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../company/providers/company_provider.dart';
import '../../subscription/providers/subscription_provider.dart';
import '../providers/trip_provider.dart';

class CreateTripScreen extends ConsumerStatefulWidget {
  const CreateTripScreen({super.key});

  @override
  ConsumerState<CreateTripScreen> createState() => _CreateTripScreenState();
}

class _CreateTripScreenState extends ConsumerState<CreateTripScreen> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _startLocationController = TextEditingController();
  final _destinationController = TextEditingController();
  final _initialBalanceController = TextEditingController(text: '1000000');
  final _startLatController = TextEditingController();
  final _startLngController = TextEditingController();
  final _destLatController = TextEditingController();
  final _destLngController = TextEditingController();

  DateTime _startDate = DateTime.now().add(const Duration(hours: 1));
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  DateTime _endDate = DateTime.now().add(const Duration(days: 3));
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);

  String? _selectedOfficerId;
  bool _showCoordinates = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _startLocationController.dispose();
    _destinationController.dispose();
    _initialBalanceController.dispose();
    _startLatController.dispose();
    _startLngController.dispose();
    _destLatController.dispose();
    _destLngController.dispose();
    super.dispose();
  }

  DateTime _combineDateTime(DateTime date, TimeOfDay time) {
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _pickStartDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate != null && mounted) {
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: _startTime,
      );
      if (pickedTime != null && mounted) {
        setState(() {
          _startDate = pickedDate;
          _startTime = pickedTime;
        });
      }
    }
  }

  Future<void> _pickEndDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _endDate.isAfter(_startDate) ? _endDate : _startDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate != null && mounted) {
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: _endTime,
      );
      if (pickedTime != null && mounted) {
        setState(() {
          _endDate = pickedDate;
          _endTime = pickedTime;
        });
      }
    }
  }

  Future<void> _submitForm() async {
    final subAsync = ref.read(subscriptionStatusProvider);
    final statusInfo = subAsync.valueOrNull?.statusInfo;
    final isSubscriptionExpired = statusInfo != null && (statusInfo.isReadOnly || statusInfo.status == 'EXPIRED' || !statusInfo.isActive);

    if (isSubscriptionExpired) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Masa langganan telah kadaluarsa. Silakan perpanjang langganan untuk membuat perjalanan baru.'),
          backgroundColor: AppColors.error,
        ),
      );
      context.push('/subscription/expired');
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    final startAt = _combineDateTime(_startDate, _startTime);
    final endAt = _combineDateTime(_endDate, _endTime);

    if (endAt.isBefore(startAt)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Waktu selesai tidak boleh lebih awal dari waktu mulai'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final initialBalance = double.tryParse(_initialBalanceController.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0.0;

    final payload = <String, dynamic>{
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      'start_location': _startLocationController.text.trim(),
      'destination': _destinationController.text.trim(),
      'start_at': startAt.toIso8601String(),
      'end_at': endAt.toIso8601String(),
      'initial_balance': initialBalance,
      if (_selectedOfficerId != null && _selectedOfficerId!.isNotEmpty) 'officer_id': _selectedOfficerId,
      if (_startLatController.text.isNotEmpty) 'start_latitude': double.tryParse(_startLatController.text),
      if (_startLngController.text.isNotEmpty) 'start_longitude': double.tryParse(_startLngController.text),
      if (_destLatController.text.isNotEmpty) 'destination_latitude': double.tryParse(_destLatController.text),
      if (_destLngController.text.isNotEmpty) 'destination_longitude': double.tryParse(_destLngController.text),
    };

    final createdTrip = await ref.read(tripActionProvider.notifier).createTrip(payload);

    if (mounted) {
      if (createdTrip != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Perjalanan ${createdTrip.tripCode} berhasil dibuat!'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      } else {
        final error = ref.read(tripActionProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Gagal membuat perjalanan dinas'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final membersAsync = ref.watch(companyMembersProvider);
    final actionState = ref.watch(tripActionProvider);
    final subAsync = ref.watch(subscriptionStatusProvider);
    final statusInfo = subAsync.valueOrNull?.statusInfo;
    final isSubscriptionExpired = statusInfo != null && (statusInfo.isReadOnly || statusInfo.status == 'EXPIRED' || !statusInfo.isActive);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    final startAtCombined = _combineDateTime(_startDate, _startTime);
    final endAtCombined = _combineDateTime(_endDate, _endTime);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Buat Perjalanan Dinas'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          32 + MediaQuery.of(context).padding.bottom,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isSubscriptionExpired) ...[
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.lock_clock_rounded, color: AppColors.error, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Langganan kadaluarsa. Perpanjang paket untuk menyimpan trip.',
                          style: TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/subscription/checkout'),
                        child: const Text('Perpanjang', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              ],
              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Judul Perjalanan *',
                  hintText: 'Contoh: Audit Lapangan Cabang Surabaya',
                  prefixIcon: Icon(Icons.assignment_outlined),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Judul perjalanan wajib diisi';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Deskripsi / Tujuan',
                  hintText: 'Tuliskan deskripsi atau instruksi perjalanan...',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
              ),
              const SizedBox(height: 20),

              // Route & Locations Section
              const Text(
                'Rute & Lokasi',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _startLocationController,
                decoration: const InputDecoration(
                  labelText: 'Lokasi Asal (Start Location) *',
                  hintText: 'Contoh: Kantor Pusat Jakarta',
                  prefixIcon: Icon(Icons.trip_origin_rounded, color: AppColors.primary),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Lokasi asal wajib diisi';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _destinationController,
                decoration: const InputDecoration(
                  labelText: 'Lokasi Tujuan (Destination) *',
                  hintText: 'Contoh: Gedung Cabang Surabaya',
                  prefixIcon: Icon(Icons.location_on, color: AppColors.error),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Lokasi tujuan wajib diisi';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 8),

              // Toggle GPS Coordinates
              TextButton.icon(
                onPressed: () => setState(() => _showCoordinates = !_showCoordinates),
                icon: Icon(_showCoordinates ? Icons.expand_less : Icons.expand_more, size: 18),
                label: Text(_showCoordinates ? 'Sembunyikan Koordinat GPS' : 'Tambah Koordinat GPS (Opsional)'),
              ),

              if (_showCoordinates) ...[
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _startLatController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(labelText: 'Start Lat', hintText: '-6.2088'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextFormField(
                        controller: _startLngController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(labelText: 'Start Lng', hintText: '106.8456'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _destLatController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(labelText: 'Dest Lat', hintText: '-7.2575'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextFormField(
                        controller: _destLngController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(labelText: 'Dest Lng', hintText: '112.7521'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],

              const SizedBox(height: 16),

              // Timeline Section
              const Text(
                'Jadwal Waktu',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                        alignment: Alignment.centerLeft,
                      ),
                      onPressed: _pickStartDate,
                      icon: const Icon(Icons.calendar_today_rounded, size: 18),
                      label: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Waktu Mulai', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          Text(dateFormat.format(startAtCombined), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                        alignment: Alignment.centerLeft,
                      ),
                      onPressed: _pickEndDate,
                      icon: const Icon(Icons.event_available_rounded, size: 18),
                      label: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Waktu Selesai', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          Text(dateFormat.format(endAtCombined), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Budget Section
              const Text(
                'Budget & Anggaran',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _initialBalanceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Budget Awal / Saldo (IDR) *',
                  hintText: '1000000',
                  prefixText: 'Rp ',
                  prefixIcon: Icon(Icons.account_balance_wallet_outlined),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Budget awal wajib diisi';
                  }
                  final num = double.tryParse(val.replaceAll(RegExp(r'[^0-9]'), ''));
                  if (num == null || num < 0) {
                    return 'Nominal budget harus bernilai >= 0';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Officer Assignment Section
              const Text(
                'Penugasan Petugas',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),

              membersAsync.when(
                data: (members) {
                  final activeMembers = members.where((m) => m.isActive).toList();

                  return DropdownButtonFormField<String>(
                    initialValue: _selectedOfficerId,
                    decoration: const InputDecoration(
                      labelText: 'Pilih Petugas (Officer)',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    items: [
                      const DropdownMenuItem<String>(
                        value: null,
                        child: Text('-- Belum Ditugaskan (Draft) --'),
                      ),
                      ...activeMembers.map(
                        (m) => DropdownMenuItem<String>(
                          value: m.userId,
                          child: Text('${m.name} (${m.role.value})'),
                        ),
                      ),
                    ],
                    onChanged: (val) {
                      setState(() {
                        _selectedOfficerId = val;
                      });
                    },
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (err, _) => Text('Gagal memuat daftar anggota: $err', style: const TextStyle(color: AppColors.error)),
              ),
              const SizedBox(height: 32),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: actionState.isLoading ? null : _submitForm,
                  icon: actionState.isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: Text(
                    actionState.isLoading ? 'Menyimpan...' : 'Simpan Perjalanan',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
