class SubscriptionPlanModel {
  final String name;
  final String code;
  final double price;

  SubscriptionPlanModel({
    required this.name,
    required this.code,
    required this.price,
  });

  factory SubscriptionPlanModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlanModel(
      name: json['name'] as String? ?? 'Monthly Plan',
      code: json['code'] as String? ?? 'MONTHLY',
      price: (json['price'] as num?)?.toDouble() ?? 50000.0,
    );
  }
}

class SubscriptionStatusInfo {
  final String status;
  final bool isActive;
  final bool isReadOnly;
  final int daysRemaining;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodStart;
  final DateTime? currentPeriodEnd;
  final SubscriptionPlanModel? plan;

  SubscriptionStatusInfo({
    required this.status,
    required this.isActive,
    required this.isReadOnly,
    required this.daysRemaining,
    this.trialEndsAt,
    this.currentPeriodStart,
    this.currentPeriodEnd,
    this.plan,
  });

  factory SubscriptionStatusInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatusInfo(
      status: json['status'] as String? ?? 'TRIAL',
      isActive: json['is_active'] as bool? ?? false,
      isReadOnly: json['is_read_only'] as bool? ?? false,
      daysRemaining: (json['days_remaining'] as num?)?.toInt() ?? 0,
      trialEndsAt: json['trial_ends_at'] != null ? DateTime.tryParse(json['trial_ends_at'].toString()) : null,
      currentPeriodStart: json['current_period_start'] != null ? DateTime.tryParse(json['current_period_start'].toString()) : null,
      currentPeriodEnd: json['current_period_end'] != null ? DateTime.tryParse(json['current_period_end'].toString()) : null,
      plan: json['plan'] != null ? SubscriptionPlanModel.fromJson(json['plan'] as Map<String, dynamic>) : null,
    );
  }
}

class SubscriptionDetailsModel {
  final String id;
  final String companyId;
  final String planId;
  final String status;
  final DateTime? trialStartedAt;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodStart;
  final DateTime? currentPeriodEnd;

  SubscriptionDetailsModel({
    required this.id,
    required this.companyId,
    required this.planId,
    required this.status,
    this.trialStartedAt,
    this.trialEndsAt,
    this.currentPeriodStart,
    this.currentPeriodEnd,
  });

  factory SubscriptionDetailsModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionDetailsModel(
      id: json['id'] as String? ?? '',
      companyId: json['company_id'] as String? ?? '',
      planId: json['plan_id'] as String? ?? '',
      status: json['status'] as String? ?? 'TRIAL',
      trialStartedAt: json['trial_started_at'] != null ? DateTime.tryParse(json['trial_started_at'].toString()) : null,
      trialEndsAt: json['trial_ends_at'] != null ? DateTime.tryParse(json['trial_ends_at'].toString()) : null,
      currentPeriodStart: json['current_period_start'] != null ? DateTime.tryParse(json['current_period_start'].toString()) : null,
      currentPeriodEnd: json['current_period_end'] != null ? DateTime.tryParse(json['current_period_end'].toString()) : null,
    );
  }
}

class SubscriptionCompanyModel {
  final String id;
  final String name;
  final String status;

  SubscriptionCompanyModel({
    required this.id,
    required this.name,
    required this.status,
  });

  factory SubscriptionCompanyModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionCompanyModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'TRIAL',
    );
  }
}

class SubscriptionResponseModel {
  final SubscriptionCompanyModel company;
  final SubscriptionDetailsModel? subscription;
  final SubscriptionPlanModel? plan;
  final SubscriptionStatusInfo statusInfo;

  SubscriptionResponseModel({
    required this.company,
    this.subscription,
    this.plan,
    required this.statusInfo,
  });

  factory SubscriptionResponseModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionResponseModel(
      company: SubscriptionCompanyModel.fromJson(json['company'] as Map<String, dynamic>? ?? {}),
      subscription: json['subscription'] != null ? SubscriptionDetailsModel.fromJson(json['subscription'] as Map<String, dynamic>) : null,
      plan: json['plan'] != null ? SubscriptionPlanModel.fromJson(json['plan'] as Map<String, dynamic>) : null,
      statusInfo: SubscriptionStatusInfo.fromJson(json['status_info'] as Map<String, dynamic>? ?? {}),
    );
  }
}

class PaymentModel {
  final String id;
  final String invoiceNumber;
  final double amount;
  final String currency;
  final String paymentGateway;
  final String paymentMethod;
  final String status;
  final DateTime? paidAt;
  final DateTime createdAt;

  PaymentModel({
    required this.id,
    required this.invoiceNumber,
    required this.amount,
    required this.currency,
    required this.paymentGateway,
    required this.paymentMethod,
    required this.status,
    this.paidAt,
    required this.createdAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] as String? ?? '',
      invoiceNumber: json['gateway_order_id'] as String? ?? json['invoice_number'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'IDR',
      paymentGateway: json['payment_gateway'] as String? ?? 'SIMULATOR',
      paymentMethod: json['payment_method'] as String? ?? 'QRIS',
      status: json['status'] as String? ?? 'PENDING',
      paidAt: json['paid_at'] != null ? DateTime.tryParse(json['paid_at'].toString()) : null,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}

class CheckoutResponseModel {
  final String invoiceNumber;
  final double amount;
  final String planName;
  final String planCode;
  final String paymentMethod;
  final String paymentUrl;
  final String? paymentToken;
  final String gateway;
  final String? clientKey;

  CheckoutResponseModel({
    required this.invoiceNumber,
    required this.amount,
    required this.planName,
    required this.planCode,
    required this.paymentMethod,
    required this.paymentUrl,
    this.paymentToken,
    this.gateway = 'MIDTRANS',
    this.clientKey,
  });

  factory CheckoutResponseModel.fromJson(Map<String, dynamic> json) {
    final checkout = json['checkout_info'] as Map<String, dynamic>? ?? json;
    return CheckoutResponseModel(
      invoiceNumber: checkout['invoice_number'] as String? ?? '',
      amount: (checkout['amount'] as num?)?.toDouble() ?? 50000.0,
      planName: checkout['plan_name'] as String? ?? 'Monthly Plan',
      planCode: checkout['plan_code'] as String? ?? 'MONTHLY',
      paymentMethod: checkout['payment_method'] as String? ?? 'QRIS',
      paymentUrl: checkout['payment_url'] as String? ?? '',
      paymentToken: checkout['payment_token'] as String?,
      gateway: checkout['gateway'] as String? ?? 'MIDTRANS',
      clientKey: checkout['client_key'] as String?,
    );
  }
}

