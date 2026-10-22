import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/permission_service.dart';
import '../../trips/providers/trip_provider.dart';
import '../../tracking/providers/location_provider.dart';
import '../providers/expense_provider.dart';
import '../models/receipt_ocr_model.dart';

class ScanReceiptScreen extends ConsumerStatefulWidget {
  final String? initialTripId;
  const ScanReceiptScreen({super.key, this.initialTripId});

  @override
  ConsumerState<ScanReceiptScreen> createState() => _ScanReceiptScreenState();
}

class _ScanReceiptScreenState extends ConsumerState<ScanReceiptScreen> {
  File? _imageFile;
  bool _isScanning = false;
  bool _isSaving = false;
  String? _draftExpenseId;

  String? _selectedTripId;
  String _selectedCategory = 'FUEL';
  DateTime _selectedDate = DateTime.now();

  final _merchantController = TextEditingController();
  final _amountController = TextEditingController();
  final _subtotalController = TextEditingController();
  final _taxController = TextEditingController();
  final _discountController = TextEditingController();
  final _descriptionController = TextEditingController();

  OcrParsedDataModel? _ocrParsedData;
  String? _scanErrorMessage;

  final List<String> _categories = [
    'FUEL',
    'TOLL',
    'ACCOMMODATION',
    'MEALS',
    'TRANSPORT',
    'SUPPLIES',
    'OTHER'
  ];

  @override
  void initState() {
    super.initState();
    _selectedTripId = widget.initialTripId;
  }

  @override
  void dispose() {
    _merchantController.dispose();
    _amountController.dispose();
    _subtotalController.dispose();
    _taxController.dispose();
    _discountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickAndScanImage(ImageSource source) async {
    try {
      if (source == ImageSource.camera) {
        final hasPerm = await PermissionService.requestCameraPermission(context);
        if (!hasPerm) return;
      } else {
        final hasPerm = await PermissionService.requestPhotosPermission(context);
        if (!hasPerm) return;
      }

      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 85);

      if (picked == null) return;

      setState(() {
        _imageFile = File(picked.path);
        _isScanning = true;
        _scanErrorMessage = null;
      });

      final dio = ApiClient().dio;
      final formData = FormData.fromMap({
        'receipt': await MultipartFile.fromFile(
          picked.path,
          filename: picked.name,
        ),
        if (_selectedTripId != null) 'trip_id': _selectedTripId,
        'auto_create_draft': 'true',
      });

      final response = await dio.post(ApiEndpoints.scanReceipt, data: formData);

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final parsed = OcrParsedDataModel.fromJson(data['parsed_data'] as Map<String, dynamic>);

        setState(() {
          _ocrParsedData = parsed;
          if (data['draft_expense'] != null) {
            _draftExpenseId = data['draft_expense']['id'];
          }

          if (parsed.merchant.isNotEmpty && parsed.merchant != 'Merchant Umum') {
            _merchantController.text = parsed.merchant;
          }
          if (parsed.amount > 0) {
            _amountController.text = parsed.amount.toStringAsFixed(0);
          }
          if (parsed.subtotal > 0) {
            _subtotalController.text = parsed.subtotal.toStringAsFixed(0);
          }
          if (parsed.tax > 0) {
            _taxController.text = parsed.tax.toStringAsFixed(0);
          }
          if (parsed.discount > 0) {
            _discountController.text = parsed.discount.toStringAsFixed(0);
          }
          if (_categories.contains(parsed.category)) {
            _selectedCategory = parsed.category;
          }
          _selectedDate = parsed.transactionDate;
          _descriptionController.text = parsed.description;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: parsed.isBlurry ? AppColors.warning : AppColors.success,
              content: Text(
                parsed.isBlurry
                    ? '⚠️ Struk terdeteksi buram. Mohon periksa data hasil OCR.'
                    : '✨ OCR & AI berhasil mengekstrak data struk!',
              ),
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _scanErrorMessage = 'Gagal memindai struk otomatis: $e. Anda dapat mengisi form secara manual.';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text(_scanErrorMessage!),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isScanning = false);
      }
    }
  }

  Future<void> _saveDraftOrSubmit({required bool isSubmit}) async {
    if (_selectedTripId == null || _selectedTripId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.error,
          content: Text('Pilih Perjalanan Dinas terlebih dahulu'),
        ),
      );
      return;
    }

    final cleanText = _amountController.text.replaceAll('.', '').replaceAll(',', '').trim();
    final amount = double.tryParse(cleanText);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.error,
          content: Text('Masukkan nominal pengeluaran yang valid'),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    // Try capturing current GPS position
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

    try {
      final dio = ApiClient().dio;
      final payload = <String, dynamic>{
        'trip_id': _selectedTripId,
        'category': _selectedCategory,
        'amount': amount,
        'date': _selectedDate.toIso8601String(),
        'description': _descriptionController.text.isNotEmpty
            ? _descriptionController.text
            : '$_selectedCategory - ${_merchantController.text}',
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
      };

      String expenseId = _draftExpenseId ?? '';

      if (expenseId.isNotEmpty) {
        // Update existing draft
        await dio.put('${ApiEndpoints.expenses}/$expenseId', data: payload);
      } else {
        // Create new expense
        if (_imageFile != null) {
          final formData = FormData.fromMap({
            ...payload,
            'receipt': await MultipartFile.fromFile(_imageFile!.path),
            'status': isSubmit ? 'PENDING' : 'DRAFT',
          });
          final res = await dio.post(ApiEndpoints.expenses, data: formData);
          expenseId = res.data['data']['id'];
        } else {
          final res = await dio.post(ApiEndpoints.expenses, data: {
            ...payload,
            'status': isSubmit ? 'PENDING' : 'DRAFT',
          });
          expenseId = res.data['data']['id'];
        }
      }

      if (isSubmit && expenseId.isNotEmpty && _draftExpenseId != null) {
        // Submit the updated draft
        await dio.post('${ApiEndpoints.expenses}/$expenseId/submit');
      }

      ref.invalidate(tripsProvider);
      ref.invalidate(officerDashboardProvider);
      ref.invalidate(expensesProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.success,
            content: Text(
              isSubmit
                  ? '✅ Pengeluaran berhasil disubmit untuk approval Manager'
                  : '💾 Draft pengeluaran berhasil disimpan',
            ),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: AppColors.error, content: Text('Gagal menyimpan: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildAiConfidenceBadge() {
    if (_ocrParsedData == null) return const SizedBox.shrink();

    final confidence = _ocrParsedData!.confidence;
    final isBlurry = _ocrParsedData!.isBlurry;
    final confidencePct = (confidence * 100).toInt();

    Color bgColor;
    IconData icon;
    String text;

    if (confidence >= 0.8) {
      bgColor = AppColors.success;
      icon = Icons.auto_awesome_rounded;
      text = 'Akurasi AI Tinggi ($confidencePct%) — Data Siap Ditinjau';
    } else if (isBlurry || confidence < 0.6) {
      bgColor = AppColors.warning;
      icon = Icons.warning_amber_rounded;
      text = 'Struk Buram / Kurang Jelas ($confidencePct%) — Mohon Koreksi Data';
    } else {
      bgColor = AppColors.primary;
      icon = Icons.info_outline_rounded;
      text = 'Akurasi AI Sedang ($confidencePct%)';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bgColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: bgColor.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: bgColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: bgColor,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tripsAsync = ref.watch(tripsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Scan & Catat Struk (AI OCR)'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          32 + MediaQuery.of(context).padding.bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Image Preview & Action Box
            Container(
              height: 220,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                ],
              ),
              child: _imageFile != null
                  ? Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(_imageFile!, fit: BoxFit.cover),
                        ),
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black.withOpacity(0.7),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(120, 38),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            icon: const Icon(Icons.refresh_rounded, size: 16),
                            label: const Text('Ganti Foto'),
                            onPressed: _isScanning ? null : () => _pickAndScanImage(ImageSource.camera),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.receipt_long_rounded, size: 48, color: AppColors.primary),
                        const SizedBox(height: 8),
                        const Text(
                          'Ambil Foto Struk untuk Ekstraksi AI Otomatis',
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Mendukung struk BBM, Tol, Hotel, Makan, & Lainnya',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(120, 44),
                              ),
                              icon: const Icon(Icons.camera_alt_rounded, size: 18),
                              label: const Text('Kamera'),
                              onPressed: () => _pickAndScanImage(ImageSource.camera),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size(120, 44),
                              ),
                              icon: const Icon(Icons.photo_library_rounded, size: 18),
                              label: const Text('Galeri'),
                              onPressed: () => _pickAndScanImage(ImageSource.gallery),
                            ),
                          ],
                        ),
                      ],
                    ),
            ),

            if (_isScanning) ...[
              const SizedBox(height: 16),
              const LinearProgressIndicator(),
              const SizedBox(height: 8),
              const Text(
                'Sedang memindai OCR & melakukan analisis AI...',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ],

            const SizedBox(height: 16),

            // 2. AI Confidence Banner
            _buildAiConfidenceBadge(),

            // 3. Trip Selection
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
                  decoration: const InputDecoration(
                    labelText: 'Perjalanan Dinas Terkait *',
                    prefixIcon: Icon(Icons.directions_car_rounded),
                  ),
                  hint: const Text('Pilih Perjalanan Dinas'),
                  items: trips.map((trip) {
                    return DropdownMenuItem<String>(
                      value: trip.id,
                      child: Text(
                        '${trip.tripCode} - ${trip.title}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() => _selectedTripId = val);
                  },
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8.0),
                child: LinearProgressIndicator(),
              ),
              error: (err, _) => Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Gagal memuat daftar perjalanan: $err', style: const TextStyle(color: AppColors.error, fontSize: 12)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 18),
                      onPressed: () => ref.refresh(tripsProvider),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // 4. Form Fields: Category & Merchant
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    value: _categories.contains(_selectedCategory) ? _selectedCategory : _categories.first,
                    decoration: const InputDecoration(
                      labelText: 'Kategori *',
                      prefixIcon: Icon(Icons.category_rounded),
                    ),
                    items: _categories.map((cat) {
                      return DropdownMenuItem<String>(value: cat, child: Text(cat));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCategory = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _merchantController,
                    decoration: const InputDecoration(
                      labelText: 'Merchant / Toko',
                      hintText: 'Contoh: SPBU KM 57',
                      prefixIcon: Icon(Icons.store_rounded),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 5. Total Amount Input
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
              decoration: const InputDecoration(
                labelText: 'Total Pengeluaran (Rp) *',
                prefixText: 'Rp ',
                prefixIcon: Icon(Icons.payments_rounded),
              ),
            ),

            const SizedBox(height: 16),

            // 6. Tax & Discount (Optional Breakdown)
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _taxController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Pajak / PPN (Rp)',
                      prefixText: 'Rp ',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _discountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Diskon (Rp)',
                      prefixText: 'Rp ',
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 7. Description / Notes
            TextField(
              controller: _descriptionController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Keterangan Tambahan',
                hintText: 'Catatan tambahan pengeluaran...',
                prefixIcon: Icon(Icons.notes_rounded),
              ),
            ),

            const SizedBox(height: 24),

            // 8. Action Buttons: Simpan Draft & Submit
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: AppColors.primary),
                    ),
                    onPressed: _isSaving ? null : () => _saveDraftOrSubmit(isSubmit: false),
                    child: const Text('Simpan Draft'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _isSaving ? null : () => _saveDraftOrSubmit(isSubmit: true),
                    child: _isSaving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Konfirmasi & Submit', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
