class UserModel {
  final String id;
  final String companyId;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final String? avatarUrl;

  UserModel({
    required this.id,
    required this.companyId,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.avatarUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      companyId: json['company_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'OFFICER',
      phone: json['phone'],
      avatarUrl: json['avatar_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'name': name,
      'email': email,
      'role': role,
      'phone': phone,
      'avatar_url': avatarUrl,
    };
  }
}
