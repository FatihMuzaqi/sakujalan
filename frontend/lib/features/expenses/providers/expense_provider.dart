import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/expense_model.dart';

final expenseCategoriesProvider = FutureProvider<List<ExpenseCategoryModel>>((ref) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(ApiEndpoints.expenseCategories);
    if (response.data['success'] == true) {
      final list = response.data['data'] as List<dynamic>;
      return list.map((e) => ExpenseCategoryModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  } catch (e) {
    return [];
  }
});

final expensesProvider = FutureProvider.family<List<ExpenseModel>, Map<String, dynamic>?>((ref, queryParams) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(
      ApiEndpoints.expenses,
      queryParameters: queryParams,
    );
    if (response.data['success'] == true) {
      final list = response.data['data'] as List<dynamic>;
      return list.map((e) => ExpenseModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  } catch (e) {
    return [];
  }
});

final pendingExpensesProvider = FutureProvider<List<ExpenseModel>>((ref) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(ApiEndpoints.pendingExpenses);
    if (response.data['success'] == true) {
      final list = response.data['data'] as List<dynamic>;
      return list.map((e) => ExpenseModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  } catch (e) {
    return [];
  }
});

final expenseDetailProvider = FutureProvider.family<ExpenseModel?, String>((ref, id) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(ApiEndpoints.expenseDetail(id));
    if (response.data['success'] == true) {
      return ExpenseModel.fromJson(response.data['data'] as Map<String, dynamic>);
    }
    return null;
  } catch (e) {
    return null;
  }
});

final walletLedgerProvider = FutureProvider.family<List<WalletTransactionModel>, Map<String, dynamic>?>((ref, queryParams) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(
      ApiEndpoints.ledger,
      queryParameters: queryParams,
    );
    if (response.data['success'] == true) {
      final list = response.data['data'] as List<dynamic>;
      return list.map((e) => WalletTransactionModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  } catch (e) {
    return [];
  }
});

final tripBalanceProvider = FutureProvider.family<TripBalanceSummaryModel?, String>((ref, tripId) async {
  try {
    final dio = ApiClient().dio;
    final response = await dio.get(ApiEndpoints.tripBalance(tripId));
    if (response.data['success'] == true) {
      return TripBalanceSummaryModel.fromJson(response.data['data'] as Map<String, dynamic>);
    }
    return null;
  } catch (e) {
    return null;
  }
});

class ExpenseActionState {
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const ExpenseActionState({
    this.isLoading = false,
    this.error,
    this.successMessage,
  });

  ExpenseActionState copyWith({
    bool? isLoading,
    String? error,
    String? successMessage,
  }) {
    return ExpenseActionState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      successMessage: successMessage,
    );
  }
}

class ExpenseActionNotifier extends StateNotifier<ExpenseActionState> {
  final Ref ref;
  ExpenseActionNotifier(this.ref) : super(const ExpenseActionState());

  Future<bool> createExpense({
    required String tripId,
    required String category,
    required double amount,
    String? description,
    DateTime? date,
    String? inputMethod,
    String? status,
    File? receiptFile,
    double? ocrConfidence,
    double? latitude,
    double? longitude,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ApiClient().dio;
      final Map<String, dynamic> map = {
        'trip_id': tripId,
        'category': category,
        'amount': amount,
        'description': description,
        'date': (date ?? DateTime.now()).toIso8601String(),
        'input_method': inputMethod ?? 'MANUAL',
        'status': status ?? 'DRAFT',
      };
      if (ocrConfidence != null) {
        map['ocr_confidence'] = ocrConfidence;
      }
      if (latitude != null) {
        map['latitude'] = latitude;
      }
      if (longitude != null) {
        map['longitude'] = longitude;
      }

      Response response;
      if (receiptFile != null) {
        final formData = FormData.fromMap({
          ...map,
          'receipt': await MultipartFile.fromFile(
            receiptFile.path,
            filename: receiptFile.path.split(Platform.pathSeparator).last,
          ),
        });
        response = await dio.post(ApiEndpoints.expenses, data: formData);
      } else {
        response = await dio.post(ApiEndpoints.expenses, data: map);
      }

      if (response.data['success'] == true) {
        ref.invalidate(expensesProvider);
        ref.invalidate(pendingExpensesProvider);
        ref.invalidate(walletLedgerProvider);
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Pengeluaran berhasil dicatat',
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal membuat pengeluaran',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> submitExpense(String expenseId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(ApiEndpoints.submitExpense(expenseId));
      if (response.data['success'] == true) {
        ref.invalidate(expensesProvider);
        ref.invalidate(pendingExpensesProvider);
        ref.invalidate(expenseDetailProvider(expenseId));
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Pengeluaran berhasil dikirim untuk persetujuan',
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal submit pengeluaran',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> approveExpense(String expenseId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(ApiEndpoints.approveExpense(expenseId));
      if (response.data['success'] == true) {
        ref.invalidate(expensesProvider);
        ref.invalidate(pendingExpensesProvider);
        ref.invalidate(expenseDetailProvider(expenseId));
        ref.invalidate(walletLedgerProvider);
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Pengeluaran disetujui dan saldo wallet dipotong',
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal menyetujui pengeluaran',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> rejectExpense(String expenseId, String rejectionReason) async {
    if (rejectionReason.trim().isEmpty) {
      state = state.copyWith(error: 'Alasan penolakan wajib diisi');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ApiClient().dio;
      final response = await dio.post(
        ApiEndpoints.rejectExpense(expenseId),
        data: {'rejection_reason': rejectionReason.trim()},
      );
      if (response.data['success'] == true) {
        ref.invalidate(expensesProvider);
        ref.invalidate(pendingExpensesProvider);
        ref.invalidate(expenseDetailProvider(expenseId));
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Pengeluaran ditolak',
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.data['message'] ?? 'Gagal menolak pengeluaran',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}

final expenseActionProvider = StateNotifierProvider<ExpenseActionNotifier, ExpenseActionState>((ref) {
  return ExpenseActionNotifier(ref);
});
