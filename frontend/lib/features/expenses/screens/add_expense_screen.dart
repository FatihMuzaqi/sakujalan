import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/permission_service.dart';
import '../../trips/providers/trip_provider.dart';
import '../../tracking/providers/location_provider.dart';
import '../providers/expense_provider.dart';

class AddExpenseScreen extends ConsumerStatefulWidget {
  final String? preselectedTripId;

  const AddExpenseScreen({super.key, this.preselectedTripId});

  @override
  ConsumerState<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends ConsumerState<AddExpenseScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();

  String? _selectedTripId;
  String _selectedCategory = 'FUEL';
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  DateTime _selectedDate = DateTime.now();

  File? _receiptImage;
  bool _isScanning = false;
  double? _ocrConfidence;

  final List<String> _categories = [
    'FUEL',
    'MEALS',
    'TOLL',
    'ACCOMMODATION',
    'TRANSPORT',
    'MAINTENANCE',
    'SUPPLIES',
    'OTHER'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
    _selectedTripId = widget.preselectedTripId;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt(ImageSource source) async {
    if (source == ImageSource.camera) {
      final hasPerm = await PermissionService.requestCameraPermission(context);
      if (!hasPerm) return;
    } else {
      final hasPerm = await PermissionService.requestPhotosPermission(context);
      if (!hasPerm) return;
    }

    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 80);

    if (picked == null) return;

    setState(() {
      _receiptImage = File(picked.path);
      _isScanning = true;
    });

    try {
      final dio = ApiClient().dio;
      final formData = FormData.fromMap({
        'receipt': await MultipartFile.fromFile(picked.path, filename: picked.name),
        if (_selectedTripId != null) 'trip_id': _selectedTripId,
      });

      final response = await dio.post(ApiEndpoints.scanReceipt, data: formData);

      if (response.data['success'] == true) {
        final parsed = response.data['data']['parsed_data'];
        setState(() {
          if (parsed['amount'] != null && (parsed['amount'] as num) > 0) {
            _amountController.text = (parsed['amount'] is num)
                ? (parsed['amount'] as num).toInt().toString()
                : parsed['amount'].toString();
          }
          if (parsed['category'] != null && _categories.contains(parsed['category'])) {
            _selectedCategory = parsed['category'];
          }
          final merchant = parsed['merchant'] ?? parsed['merchant_name'] ?? '';
          if (merchant.toString().isNotEmpty && merchant != 'Merchant Umum') {
            _descriptionController.text = merchant.toString();
          }
          if (parsed['transaction_date'] != null) {
            _selectedDate = DateTime.tryParse(parsed['transaction_date'].toString()) ?? _selectedDate;
          }
          _ocrConfidence = (parsed['confidence'] as num?)?.toDouble() ?? 0.85;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppColors.success,
              content: Text('✨ Berhasil mengekstrak data dari struk secara otomatis!'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OCR Gagal membaca teks ($e), silakan lengkapi data manual.'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isScanning = false);
      }
    }
  }

  Future<void> _handleSave({required bool isDraft}) async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedTripId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.error,
          content: Text('Pilih perjalanan dinas terlebih dahulu'),
        ),
      );
      return;
    }

    final amount = double.tryParse(_amountController.text.replaceAll(RegExp(r'[^0-9.]'), ''));
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.error,
          content: Text('Nominal harus lebih besar dari 0'),
        ),
      );
      return;
    }

    // Try capturing current GPS coordinates
    double? latitude;
    double? longitude;
    try {
      final trackerState = ref.read(locationTrackerProvider);
      if (trackerState.lastPoint != null) {
        latitude = trackerState.lastPoint!.latitude;
        longitude = trackerState.lastPoint!.longitude;
      } else {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
        ).timeout(const Duration(seconds: 3));
        latitude = pos.latitude;
        longitude = pos.longitude;
      }
    } catch (_) {}

    final inputMethod = (_tabController.index == 1 || _receiptImage != null) ? 'RECEIPT_SCAN' : 'MANUAL';
    final status = isDraft ? 'DRAFT' : 'PENDING';

    final success = await ref.read(expenseActionProvider.notifier).createExpense(
      tripId: _selectedTripId!,
      category: _selectedCategory,
      amount: amount,
      description: _descriptionController.text.trim(),
      date: _selectedDate,
      inputMethod: inputMethod,
      status: status,
      receiptFile: _receiptImage,
      ocrConfidence: _ocrConfidence,
      latitude: latitude,
      longitude: longitude,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text(
            isDraft
                ? '✅ Pengeluaran disimpan sebagai Draft'
                : '🚀 Pengeluaran dikirim untuk persetujuan manajer',
          ),
        ),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripsAsync = ref.watch(tripsProvider);
    final actionState = ref.watch(expenseActionProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Catat Pengeluaran'),
        bottom: TabBar(
          controller: _tabController,
          onTap: (index) => setState(() {}),
          tabs: const [
            Tab(icon: Icon(Icons.edit_note_rounded), text: 'Input Manual'),
            Tab(icon: Icon(Icons.document_scanner_rounded), text: 'Scan Struk (OCR)'),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          32 + MediaQuery.of(context).padding.bottom,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // OCR Scanner Preview Box (shown on Tab 2 or if receipt is picked)
              if (_tabController.index == 1 || _receiptImage != null) ...[
                Container(
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: _receiptImage != null
                      ? Stack(
                          children: [
                            Positioned.fill(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.file(_receiptImage!, fit: BoxFit.cover),
                              ),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: CircleAvatar(
                                backgroundColor: Colors.black54,
                                child: IconButton(
                                  icon: const Icon(Icons.close, color: Colors.white, size: 18),
                                  onPressed: () => setState(() {
                                    _receiptImage = null;
                                    _ocrConfidence = null;
                                  }),
                                ),
                              ),
                            ),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.receipt_long_rounded, size: 44, color: AppColors.primary),
                            const SizedBox(height: 8),
                            const Text(
                              'Ambil foto struk untuk deteksi nominal otomatis',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Ekstraksi AI otomatis untuk BBM, Tol, Hotel, Makan',
                              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    minimumSize: const Size(120, 44),
                                  ),
                                  icon: const Icon(Icons.camera_alt_rounded, size: 16),
                                  label: const Text('Kamera'),
                                  onPressed: () => _pickReceipt(ImageSource.camera),
                                ),
                                const SizedBox(width: 12),
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    minimumSize: const Size(120, 44),
                                  ),
                                  icon: const Icon(Icons.photo_library_rounded, size: 16),
                                  label: const Text('Galeri'),
                                  onPressed: () => _pickReceipt(ImageSource.gallery),
                                ),
                              ],
                            ),
                          ],
                        ),
                ),
                if (_isScanning) ...[
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(),
                  const SizedBox(height: 6),
                  const Text(
                    'Sedang mengekstrak struk dengan OCR AI...',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
                const SizedBox(height: 16),
              ],

              // Trip selector
              tripsAsync.when(
                data: (trips) {
                  if (trips.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Belum ada perjalanan dinas. Buat trip baru terlebih dahulu.',
                              style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  // If _selectedTripId is not set or not in list, auto-select the first trip
                  if (_selectedTripId == null || !trips.any((t) => t.id == _selectedTripId)) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted && _selectedTripId != trips.first.id) {
                        setState(() {
                          _selectedTripId = trips.first.id;
                        });
                      }
                    });
                  }

                  final selectedValue = trips.any((t) => t.id == _selectedTripId)
                      ? _selectedTripId
                      : trips.first.id;

                  return DropdownButtonFormField<String>(
                    value: selectedValue,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Perjalanan Dinas *',
                      prefixIcon: Icon(Icons.card_travel_rounded),
                    ),
                    items: trips.map((trip) {
                      return DropdownMenuItem<String>(
                        value: trip.id,
                        child: Text(
                          '${trip.tripCode} - ${trip.title}',
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      );
                    }).toList(),
                    validator: (val) => val == null ? 'Perjalanan dinas wajib dipilih' : null,
                    onChanged: (val) => setState(() => _selectedTripId = val),
                  );
                },
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: LinearProgressIndicator(),
                ),
                error: (err, _) => Text('Gagal memuat daftar trip: $err', style: const TextStyle(color: AppColors.error, fontSize: 12)),
              ),
              const SizedBox(height: 16),

              // Category dropdown
              DropdownButtonFormField<String>(
                value: _categories.contains(_selectedCategory) ? _selectedCategory : _categories.first,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Kategori Pengeluaran *',
                  prefixIcon: Icon(Icons.category_rounded),
                ),
                items: _categories.map((cat) {
                  return DropdownMenuItem<String>(
                    value: cat,
                    child: Text(cat, maxLines: 1, overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
              const SizedBox(height: 16),

              // Amount field
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Nominal Biaya (Rp) *',
                  prefixIcon: Icon(Icons.attach_money_rounded),
                  prefixText: 'Rp ',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Nominal wajib diisi';
                  final num = double.tryParse(val.replaceAll(RegExp(r'[^0-9.]'), ''));
                  if (num == null || num <= 0) return 'Nominal harus lebih dari 0';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description / Merchant field
              TextFormField(
                controller: _descriptionController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Keterangan / Merchant',
                  hintText: 'Contoh: BBM Tol Cikampek / Restoran Sederhana',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
              ),
              const SizedBox(height: 16),

              // Date Picker Tile
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                tileColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: AppColors.border),
                ),
                leading: const Icon(Icons.calendar_today_rounded, color: AppColors.primary),
                title: const Text('Tanggal Pengeluaran', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                subtitle: Text(
                  '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now().subtract(const Duration(days: 90)),
                    lastDate: DateTime.now().add(const Duration(days: 30)),
                  );
                  if (picked != null) {
                    setState(() => _selectedDate = picked);
                  }
                },
              ),
              const SizedBox(height: 28),

              // Action buttons
              if (actionState.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    actionState.error!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: actionState.isLoading ? null : () => _handleSave(isDraft: true),
                      child: const Text('Simpan Draft'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: actionState.isLoading ? null : () => _handleSave(isDraft: false),
                      child: actionState.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Kirim Persetujuan'),
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
