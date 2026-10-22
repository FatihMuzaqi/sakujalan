class CompanyModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? address;
  final String? logo;
  final String status;
  final int totalMembers;
  final DateTime? createdAt;

  CompanyModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.address,
    this.logo,
    required this.status,
    this.totalMembers = 0,
    this.createdAt,
  });

  factory CompanyModel.fromJson(Map<String, dynamic> json) {
    return CompanyModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      address: json['address'],
      logo: json['logo'],
      status: json['status'] ?? 'TRIAL',
      totalMembers: json['total_members'] ?? 0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'address': address,
      'logo': logo,
      'status': status,
      'total_members': totalMembers,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}

class CompanyProfileResponse {
  final CompanyModel company;
  final String subscriptionStatus;
  final String planName;
  final int daysRemaining;
  final bool isReadOnly;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodEnd;

  CompanyProfileResponse({
    required this.company,
    required this.subscriptionStatus,
    required this.planName,
    required this.daysRemaining,
    required this.isReadOnly,
    this.trialEndsAt,
    this.currentPeriodEnd,
  });

  factory CompanyProfileResponse.fromJson(Map<String, dynamic> json) {
    final compData = json['company'] ?? {};
    final subData = json['subscription_info'] ?? {};

    return CompanyProfileResponse(
      company: CompanyModel.fromJson(compData),
      subscriptionStatus: subData['status'] ?? 'TRIAL',
      planName: subData['plan_name'] ?? 'Standard Plan',
      daysRemaining: subData['days_remaining'] ?? 0,
      isReadOnly: subData['is_read_only'] ?? false,
      trialEndsAt: subData['trial_ends_at'] != null ? DateTime.tryParse(subData['trial_ends_at']) : null,
      currentPeriodEnd: subData['current_period_end'] != null ? DateTime.tryParse(subData['current_period_end']) : null,
    );
  }
}
