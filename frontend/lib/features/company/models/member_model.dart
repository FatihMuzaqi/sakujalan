import '../../../core/constants/app_enums.dart';

class MemberModel {
  final String id;
  final String companyId;
  final String userId;
  final String name;
  final String email;
  final String? phone;
  final UserRole role;
  final String status;
  final DateTime? joinedAt;
  final bool isActive;

  MemberModel({
    required this.id,
    required this.companyId,
    required this.userId,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    required this.status,
    this.joinedAt,
    this.isActive = true,
  });

  factory MemberModel.fromJson(Map<String, dynamic> json) {
    return MemberModel(
      id: json['id'] ?? '',
      companyId: json['company_id'] ?? '',
      userId: json['user_id'] ?? '',
      name: json['name'] ?? 'Unknown',
      email: json['email'] ?? '',
      phone: json['phone'],
      role: UserRole.fromString(json['role'] ?? 'OFFICER'),
      status: json['status'] ?? 'ACTIVE',
      joinedAt: json['joined_at'] != null ? DateTime.tryParse(json['joined_at']) : null,
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'user_id': userId,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role.value,
      'status': status,
      'joined_at': joinedAt?.toIso8601String(),
      'is_active': isActive,
    };
  }
}
