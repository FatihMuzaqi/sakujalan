import '../../../core/constants/app_enums.dart';

class ExpenseCategoryModel {
  final String id;
  final String name;
  final String code;
  final String? icon;
  final bool isActive;

  ExpenseCategoryModel({
    required this.id,
    required this.name,
    required this.code,
    this.icon,
    this.isActive = true,
  });

  factory ExpenseCategoryModel.fromJson(Map<String, dynamic> json) {
    return ExpenseCategoryModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      code: json['code'] ?? '',
      icon: json['icon'],
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'code': code,
      'icon': icon,
      'is_active': isActive,
    };
  }
}

class ExpenseApprovalModel {
  final String id;
  final String expenseId;
  final String approverId;
  final String? approverName;
  final String action;
  final String? rejectionReason;
  final DateTime createdAt;

  ExpenseApprovalModel({
    required this.id,
    required this.expenseId,
    required this.approverId,
    this.approverName,
    required this.action,
    this.rejectionReason,
    required this.createdAt,
  });

  factory ExpenseApprovalModel.fromJson(Map<String, dynamic> json) {
    return ExpenseApprovalModel(
      id: json['id'] ?? '',
      expenseId: json['expense_id'] ?? '',
      approverId: json['approver_id'] ?? '',
      approverName: json['approver'] != null ? json['approver']['name'] : null,
      action: json['action'] ?? '',
      rejectionReason: json['rejection_reason'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }
}

class ExpenseModel {
  final String id;
  final String companyId;
  final String tripId;
  final String? tripTitle;
  final String? tripCode;
  final String officerId;
  final String? officerName;
  final String? categoryId;
  final String category;
  final double amount;
  final InputMethod inputMethod;
  final ExpenseStatus status;
  final String? receiptUrl;
  final String? description;
  final DateTime? date;
  final String? rejectionReason;
  final double? ocrConfidence;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final List<ExpenseApprovalModel> approvals;

  ExpenseModel({
    required this.id,
    required this.companyId,
    required this.tripId,
    this.tripTitle,
    this.tripCode,
    required this.officerId,
    this.officerName,
    this.categoryId,
    required this.category,
    required this.amount,
    required this.inputMethod,
    required this.status,
    this.receiptUrl,
    this.description,
    this.date,
    this.rejectionReason,
    this.ocrConfidence,
    this.latitude,
    this.longitude,
    required this.createdAt,
    this.approvals = const [],
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    final trip = json['trip'] as Map<String, dynamic>?;
    final officer = json['officer'] as Map<String, dynamic>?;
    final rawApprovals = json['approvals'] as List<dynamic>? ?? [];

    return ExpenseModel(
      id: json['id'] ?? '',
      companyId: json['company_id'] ?? '',
      tripId: json['trip_id'] ?? '',
      tripTitle: trip?['title'],
      tripCode: trip?['trip_code'],
      officerId: json['officer_id'] ?? '',
      officerName: officer?['name'],
      categoryId: json['category_id'],
      category: json['category'] ?? 'OTHER',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      inputMethod: InputMethod.fromString(json['input_method']?.toString() ?? 'MANUAL'),
      status: ExpenseStatus.fromString(json['status']?.toString() ?? 'PENDING'),
      receiptUrl: json['receipt_url'],
      description: json['description'],
      date: json['date'] != null ? DateTime.tryParse(json['date']) : null,
      rejectionReason: json['rejection_reason'],
      ocrConfidence: json['ocr_confidence'] != null
          ? (json['ocr_confidence'] as num).toDouble()
          : null,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      approvals: rawApprovals
          .map((a) => ExpenseApprovalModel.fromJson(a as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isDraft => status.isDraft;
  bool get isPending => status.isPending;
  bool get isApproved => status.isApproved;
  bool get isRejected => status.isRejected;
}

class WalletTransactionModel {
  final String id;
  final String? tripId;
  final String? tripTitle;
  final String? userId;
  final String? userName;
  final WalletTransactionType type;
  final double amount;
  final double balanceBefore;
  final double balanceAfter;
  final String? referenceId;
  final String? description;
  final DateTime createdAt;

  WalletTransactionModel({
    required this.id,
    this.tripId,
    this.tripTitle,
    this.userId,
    this.userName,
    required this.type,
    required this.amount,
    required this.balanceBefore,
    required this.balanceAfter,
    this.referenceId,
    this.description,
    required this.createdAt,
  });

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) {
    final trip = json['trip'] as Map<String, dynamic>?;
    final user = json['user'] as Map<String, dynamic>?;

    return WalletTransactionModel(
      id: json['id'] ?? '',
      tripId: json['trip_id'],
      tripTitle: trip?['title'],
      userId: json['user_id'],
      userName: user?['name'],
      type: WalletTransactionType.fromString(json['type']?.toString() ?? 'EXPENSE'),
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      balanceBefore: (json['balance_before'] is num)
          ? (json['balance_before'] as num).toDouble()
          : double.tryParse(json['balance_before']?.toString() ?? '0') ?? 0.0,
      balanceAfter: (json['balance_after'] is num)
          ? (json['balance_after'] as num).toDouble()
          : double.tryParse(json['balance_after']?.toString() ?? '0') ?? 0.0,
      referenceId: json['reference_id'],
      description: json['description'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }

  bool get isCredit => type == WalletTransactionType.initial || type == WalletTransactionType.topUp || type == WalletTransactionType.refund;
}

class TripBalanceSummaryModel {
  final String tripId;
  final String? tripCode;
  final String title;
  final double initialBalance;
  final double remainingBudget;
  final double totalSpent;
  final double usagePercentage;
  final int transactionsCount;

  TripBalanceSummaryModel({
    required this.tripId,
    this.tripCode,
    required this.title,
    required this.initialBalance,
    required this.remainingBudget,
    required this.totalSpent,
    required this.usagePercentage,
    required this.transactionsCount,
  });

  factory TripBalanceSummaryModel.fromJson(Map<String, dynamic> json) {
    return TripBalanceSummaryModel(
      tripId: json['trip_id'] ?? '',
      tripCode: json['trip_code'],
      title: json['title'] ?? '',
      initialBalance: (json['initial_balance'] is num)
          ? (json['initial_balance'] as num).toDouble()
          : double.tryParse(json['initial_balance']?.toString() ?? '0') ?? 0.0,
      remainingBudget: (json['remaining_budget'] is num)
          ? (json['remaining_budget'] as num).toDouble()
          : double.tryParse(json['remaining_budget']?.toString() ?? '0') ?? 0.0,
      totalSpent: (json['total_spent'] is num)
          ? (json['total_spent'] as num).toDouble()
          : double.tryParse(json['total_spent']?.toString() ?? '0') ?? 0.0,
      usagePercentage: (json['usage_percentage'] is num)
          ? (json['usage_percentage'] as num).toDouble()
          : double.tryParse(json['usage_percentage']?.toString() ?? '0') ?? 0.0,
      transactionsCount: json['transactions_count'] ?? 0,
    );
  }
}
