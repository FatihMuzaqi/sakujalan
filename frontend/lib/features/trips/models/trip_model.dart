import '../../../core/constants/app_enums.dart';

class TripMemberModel {
  final String id;
  final String tripId;
  final String userId;
  final String role;
  final DateTime? assignedAt;
  final String? userName;
  final String? userEmail;

  TripMemberModel({
    required this.id,
    required this.tripId,
    required this.userId,
    required this.role,
    this.assignedAt,
    this.userName,
    this.userEmail,
  });

  factory TripMemberModel.fromJson(Map<String, dynamic> json) {
    return TripMemberModel(
      id: json['id'] ?? '',
      tripId: json['trip_id'] ?? json['tripId'] ?? '',
      userId: json['user_id'] ?? json['userId'] ?? '',
      role: json['role'] ?? 'OFFICER',
      assignedAt: json['assigned_at'] != null ? DateTime.tryParse(json['assigned_at']) : null,
      userName: json['user']?['name'],
      userEmail: json['user']?['email'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'user_id': userId,
      'role': role,
      'assigned_at': assignedAt?.toIso8601String(),
    };
  }
}

class TripModel {
  final String id;
  final String? companyId;
  final String? createdBy;
  final String? officerId;
  final String tripCode;
  final String title;
  final String? description;
  final String startLocation;
  final double? startLatitude;
  final double? startLongitude;
  final String destination;
  final double? destinationLatitude;
  final double? destinationLongitude;
  final DateTime startAt;
  final DateTime endAt;
  final double initialBalance;
  final double remainingBudget;
  final TripStatus status;
  final String? officerName;
  final String? officerEmail;
  final String? creatorName;
  final List<TripMemberModel> members;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Backwards compatibility getters
  String get origin => startLocation;
  String? get purpose => description;
  DateTime get startDate => startAt;
  DateTime get endDate => endAt;
  double get allocatedBudget => initialBalance;
  String get statusString => status.value;
  String? get originCity => startLocation;
  String? get destinationCity => destination;
  double get approvedAllowanceAmount => initialBalance;
  double get estimatedBudget => initialBalance;

  TripModel({
    required this.id,
    this.companyId,
    this.createdBy,
    this.officerId,
    required this.tripCode,
    required this.title,
    this.description,
    required this.startLocation,
    this.startLatitude,
    this.startLongitude,
    required this.destination,
    this.destinationLatitude,
    this.destinationLongitude,
    required this.startAt,
    required this.endAt,
    required this.initialBalance,
    required this.remainingBudget,
    required this.status,
    this.officerName,
    this.officerEmail,
    this.creatorName,
    this.members = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    // Parse dates with fallbacks for both start_at and start_date
    final startRaw = json['start_at'] ?? json['start_date'] ?? DateTime.now().toIso8601String();
    final endRaw = json['end_at'] ?? json['end_date'] ?? DateTime.now().toIso8601String();

    // Parse initial balance with fallback for allocated_budget
    final initialBal = double.tryParse(
          (json['initial_balance'] ?? json['allocated_budget'] ?? '0').toString(),
        ) ??
        0.0;

    final remainingBal = double.tryParse(
          (json['remaining_budget'] ?? json['initial_balance'] ?? json['allocated_budget'] ?? '0').toString(),
        ) ??
        0.0;

    // Parse status
    final rawStatus = json['status']?.toString() ?? 'DRAFT';
    final parsedStatus = TripStatus.fromString(rawStatus);

    // Members list
    List<TripMemberModel> membersList = [];
    if (json['members'] != null && json['members'] is List) {
      membersList = (json['members'] as List)
          .map((m) => TripMemberModel.fromJson(m is Map<String, dynamic> ? m : {}))
          .toList();
    }

    return TripModel(
      id: json['id'] ?? '',
      companyId: json['company_id'],
      createdBy: json['created_by'],
      officerId: json['officer_id'] ?? json['officer']?['id'],
      tripCode: json['trip_code'] ?? 'TRP-PENDING',
      title: json['title'] ?? '',
      description: json['description'] ?? json['purpose'],
      startLocation: json['start_location'] ?? json['origin'] ?? '',
      startLatitude: json['start_latitude'] != null ? double.tryParse(json['start_latitude'].toString()) : null,
      startLongitude: json['start_longitude'] != null ? double.tryParse(json['start_longitude'].toString()) : null,
      destination: json['destination'] ?? '',
      destinationLatitude: json['destination_latitude'] != null ? double.tryParse(json['destination_latitude'].toString()) : null,
      destinationLongitude: json['destination_longitude'] != null ? double.tryParse(json['destination_longitude'].toString()) : null,
      startAt: DateTime.tryParse(startRaw) ?? DateTime.now(),
      endAt: DateTime.tryParse(endRaw) ?? DateTime.now(),
      initialBalance: initialBal,
      remainingBudget: remainingBal,
      status: parsedStatus,
      officerName: json['officer']?['name'] ?? (membersList.isNotEmpty ? membersList.first.userName : null),
      officerEmail: json['officer']?['email'],
      creatorName: json['creator']?['name'],
      members: membersList,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      'created_by': createdBy,
      'officer_id': officerId,
      'trip_code': tripCode,
      'title': title,
      'description': description,
      'start_location': startLocation,
      'start_latitude': startLatitude,
      'start_longitude': startLongitude,
      'destination': destination,
      'destination_latitude': destinationLatitude,
      'destination_longitude': destinationLongitude,
      'start_at': startAt.toIso8601String(),
      'end_at': endAt.toIso8601String(),
      'initial_balance': initialBalance,
      'remaining_budget': remainingBudget,
      'status': status.value,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

class OfficerDashboardData {
  final TripModel? activeTrip;
  final String destination;
  final double balance;
  final String gpsStatus;
  final double todayExpensesTotal;
  final int todayExpensesCount;
  final List<dynamic> todayExpenses;
  final String officerName;
  final String officerRole;

  OfficerDashboardData({
    this.activeTrip,
    required this.destination,
    required this.balance,
    required this.gpsStatus,
    required this.todayExpensesTotal,
    required this.todayExpensesCount,
    this.todayExpenses = const [],
    required this.officerName,
    required this.officerRole,
  });

  factory OfficerDashboardData.fromJson(Map<String, dynamic> json) {
    TripModel? trip;
    if (json['active_trip'] != null) {
      trip = TripModel.fromJson(json['active_trip']);
    }

    final todayExp = json['today_expenses'];
    double expTotal = 0.0;
    int expCount = 0;
    List<dynamic> expItems = [];

    if (todayExp is Map<String, dynamic>) {
      expTotal = double.tryParse(todayExp['total']?.toString() ?? '0') ?? 0.0;
      expCount = int.tryParse(todayExp['count']?.toString() ?? '0') ?? 0;
      expItems = todayExp['items'] is List ? todayExp['items'] : [];
    }

    return OfficerDashboardData(
      activeTrip: trip,
      destination: json['destination'] ?? (trip?.destination ?? '-'),
      balance: double.tryParse(json['balance']?.toString() ?? (trip?.remainingBudget.toString() ?? '0')) ?? 0.0,
      gpsStatus: json['gps_status'] ?? 'STANDBY',
      todayExpensesTotal: expTotal,
      todayExpensesCount: expCount,
      todayExpenses: expItems,
      officerName: json['officer']?['name'] ?? '',
      officerRole: json['officer']?['role'] ?? 'OFFICER',
    );
  }
}
