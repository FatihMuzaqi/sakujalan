import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../company/providers/company_provider.dart';
import '../providers/trip_provider.dart';

class EditTripScreen extends ConsumerStatefulWidget {
  final String tripId;

  const EditTripScreen({super.key, required this.tripId});

  @override
  ConsumerState<EditTripScreen> createState() => _EditTripScreenState();
}

class _EditTripScreenState extends ConsumerState<EditTripScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _startLocationController;
  late TextEditingController _destinationController;
  late TextEditingController _initialBalanceController;
  late TextEditingController _startLatController;
  late TextEditingController _startLngController;
  late TextEditingController _destLatController;
  late TextEditingController _destLngController;

  DateTime _startDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  DateTime _endDate = DateTime.now().add(const Duration(days: 3));
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);

  String? _selectedOfficerId;
  bool _initialized = false;
  bool _showCoordinates = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descriptionController = TextEditingController();
    _startLocationController = TextEditingController();
    _destinationController = TextEditingController();
    _initialBalanceController = TextEditingController();
    _startLatController = TextEditingController();
    _startLngController = TextEditingController();
    _destLatController = TextEditingController();
    _destLngController = TextEditingController();
  }

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
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
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

    final updated = await ref.read(tripActionProvider.notifier).updateTrip(widget.tripId, payload);

    if (mounted) {
      if (updated != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Perjalanan ${updated.tripCode} berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      } else {
        final error = ref.read(tripActionProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Gagal memperbarui perjalanan'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(tripDetailProvider(widget.tripId));
    final membersAsync = ref.watch(companyMembersProvider);
    final actionState = ref.watch(tripActionProvider);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Perjalanan Dinas'),
      ),
      body: tripAsync.when(
        data: (trip) {
          if (!_initialized) {
            _titleController.text = trip.title;
            _descriptionController.text = trip.description ?? '';
            _startLocationController.text = trip.startLocation;
            _destinationController.text = trip.destination;
            _initialBalanceController.text = trip.initialBalance.toStringAsFixed(0);
            _startLatController.text = trip.startLatitude?.toString() ?? '';
            _startLngController.text = trip.startLongitude?.toString() ?? '';
            _destLatController.text = trip.destinationLatitude?.toString() ?? '';
            _destLngController.text = trip.destinationLongitude?.toString() ?? '';
            _startDate = trip.startAt;
            _startTime = TimeOfDay(hour: trip.startAt.hour, minute: trip.startAt.minute);
            _endDate = trip.endAt;
            _endTime = TimeOfDay(hour: trip.endAt.hour, minute: trip.endAt.minute);
            _selectedOfficerId = trip.officerId;
            _initialized = true;
          }

          final startAtCombined = _combineDateTime(_startDate, _startTime);
          final endAtCombined = _combineDateTime(_endDate, _endTime);

          return SingleChildScrollView(
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
                  // Trip Code Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'KODE: ${trip.tripCode}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Judul Perjalanan *',
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
                      labelText: 'Lokasi Asal *',
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
                      labelText: 'Lokasi Tujuan *',
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

                  TextButton.icon(
                    onPressed: () => setState(() => _showCoordinates = !_showCoordinates),
                    icon: Icon(_showCoordinates ? Icons.expand_less : Icons.expand_more, size: 18),
                    label: Text(_showCoordinates ? 'Sembunyikan Koordinat GPS' : 'Ubah Koordinat GPS'),
                  ),

                  if (_showCoordinates) ...[
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _startLatController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                            decoration: const InputDecoration(labelText: 'Start Lat'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _startLngController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                            decoration: const InputDecoration(labelText: 'Start Lng'),
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
                            decoration: const InputDecoration(labelText: 'Dest Lat'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _destLngController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                            decoration: const InputDecoration(labelText: 'Dest Lng'),
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
                      labelText: 'Budget Awal (IDR) *',
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

                  // Officer Assignment
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
                            child: Text('-- Belum Ditugaskan --'),
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
                    error: (err, _) => Text('Gagal memuat anggota: $err', style: const TextStyle(color: AppColors.error)),
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
                          : const Icon(Icons.save_outlined),
                      label: Text(
                        actionState.isLoading ? 'Menyimpan...' : 'Perbarui Perjalanan',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
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
                onPressed: () => ref.refresh(tripDetailProvider(widget.tripId)),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
