import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../models/subscription_model.dart';

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>((ref) {
  return SubscriptionRepository();
});

class SubscriptionRepository {
  final _dio = ApiClient().dio;

  Future<SubscriptionResponseModel> getSubscriptionStatus() async {
    final response = await _dio.get(ApiEndpoints.subscriptionStatus);
    if (response.data != null && response.data['success'] == true) {
      final dataMap = response.data['data'] as Map<String, dynamic>;
      return SubscriptionResponseModel.fromJson(dataMap);
    }
    throw Exception(response.data?['message'] ?? 'Failed to load subscription status');
  }

  Future<CheckoutResponseModel> checkout({
    required String paymentMethod,
    String gateway = 'MIDTRANS',
    String? planCode,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.subscriptionCheckout,
      data: {
        'payment_method': paymentMethod,
        'gateway': gateway,
        if (planCode != null) 'plan_code': planCode,
      },
    );
    if (response.data != null && response.data['success'] == true) {
      final dataMap = response.data['data'] as Map<String, dynamic>;
      return CheckoutResponseModel.fromJson(dataMap);
    }
    throw Exception(response.data?['message'] ?? 'Checkout failed');
  }

  Future<List<PaymentModel>> getPaymentHistory() async {
    final response = await _dio.get('${ApiEndpoints.subscriptionStatus}/history');
    if (response.data != null && response.data['success'] == true) {
      final list = response.data['data']['payments'] as List<dynamic>? ?? [];
      return list.map((item) => PaymentModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> syncPayment({String? invoiceNumber}) async {
    final response = await _dio.post(
      '/subscription/sync-payment',
      data: {
        if (invoiceNumber != null) 'invoice_number': invoiceNumber,
      },
    );
    if (response.data != null && response.data['success'] == true) {
      return response.data['data'] as Map<String, dynamic>? ?? {};
    }
    return {};
  }

  Future<void> simulatePayment(String invoiceNumber) async {
    await _dio.get('/webhooks/pay-simulator/$invoiceNumber');
  }
}

final subscriptionStatusProvider =
    AsyncNotifierProvider.autoDispose<SubscriptionStatusNotifier, SubscriptionResponseModel>(
  SubscriptionStatusNotifier.new,
);

class SubscriptionStatusNotifier extends AutoDisposeAsyncNotifier<SubscriptionResponseModel> {
  @override
  Future<SubscriptionResponseModel> build() async {
    final repo = ref.watch(subscriptionRepositoryProvider);
    return await repo.getSubscriptionStatus();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(subscriptionRepositoryProvider);
      return await repo.getSubscriptionStatus();
    });
  }
}

final paymentHistoryProvider = FutureProvider.autoDispose<List<PaymentModel>>((ref) async {
  final repo = ref.watch(subscriptionRepositoryProvider);
  return await repo.getPaymentHistory();
});
