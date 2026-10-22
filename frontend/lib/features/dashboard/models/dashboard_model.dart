class DashboardKpiModel {
  final int activeTripsCount;
  final int scheduledTripsCount;
  final int completedTripsCount;
  final int totalTripsCount;
  final int pendingExpensesCount;
  final double pendingExpensesAmount;
  final double totalSpending;
  final double remainingBudget;
  final double totalAllocatedBudget;
  final int activeOfficersCount;
  final int totalOfficersCount;
  final double utilizationPercentage;

  DashboardKpiModel({
    required this.activeTripsCount,
    required this.scheduledTripsCount,
    required this.completedTripsCount,
    required this.totalTripsCount,
    required this.pendingExpensesCount,
    required this.pendingExpensesAmount,
    required this.totalSpending,
    required this.remainingBudget,
    required this.totalAllocatedBudget,
    required this.activeOfficersCount,
    required this.totalOfficersCount,
    required this.utilizationPercentage,
  });

  factory DashboardKpiModel.fromJson(Map<String, dynamic> json) {
    return DashboardKpiModel(
      activeTripsCount: (json['active_trips_count'] as num?)?.toInt() ?? 0,
      scheduledTripsCount: (json['scheduled_trips_count'] as num?)?.toInt() ?? 0,
      completedTripsCount: (json['completed_trips_count'] as num?)?.toInt() ?? 0,
      totalTripsCount: (json['total_trips_count'] as num?)?.toInt() ?? 0,
      pendingExpensesCount: (json['pending_expenses_count'] as num?)?.toInt() ?? 0,
      pendingExpensesAmount: (json['pending_expenses_amount'] as num?)?.toDouble() ?? 0.0,
      totalSpending: (json['total_spending'] as num?)?.toDouble() ?? 0.0,
      remainingBudget: (json['remaining_budget'] as num?)?.toDouble() ?? 0.0,
      totalAllocatedBudget: (json['total_allocated_budget'] as num?)?.toDouble() ?? 0.0,
      activeOfficersCount: (json['active_officers_count'] as num?)?.toInt() ?? 0,
      totalOfficersCount: (json['total_officers_count'] as num?)?.toInt() ?? 0,
      utilizationPercentage: (json['utilization_percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ActiveTripOfficerModel {
  final String id;
  final String name;
  final String? email;
  final String? phone;

  ActiveTripOfficerModel({
    required this.id,
    required this.name,
    this.email,
    this.phone,
  });

  factory ActiveTripOfficerModel.fromJson(Map<String, dynamic> json) {
    return ActiveTripOfficerModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Petugas',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
    );
  }
}

class LatestLocationModel {
  final double latitude;
  final double longitude;
  final double? speed;
  final double? heading;
  final DateTime? recordedAt;

  LatestLocationModel({
    required this.latitude,
    required this.longitude,
    this.speed,
    this.heading,
    this.recordedAt,
  });

  factory LatestLocationModel.fromJson(Map<String, dynamic> json) {
    return LatestLocationModel(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      speed: (json['speed'] as num?)?.toDouble(),
      heading: (json['heading'] as num?)?.toDouble(),
      recordedAt: json['recorded_at'] != null ? DateTime.tryParse(json['recorded_at'].toString()) : null,
    );
  }
}

class ActiveTripSummaryModel {
  final String id;
  final String tripCode;
  final String title;
  final String startLocation;
  final String destination;
  final String status;
  final double initialBalance;
  final double remainingBudget;
  final ActiveTripOfficerModel? officer;
  final LatestLocationModel? latestLocation;

  ActiveTripSummaryModel({
    required this.id,
    required this.tripCode,
    required this.title,
    required this.startLocation,
    required this.destination,
    required this.status,
    required this.initialBalance,
    required this.remainingBudget,
    this.officer,
    this.latestLocation,
  });

  factory ActiveTripSummaryModel.fromJson(Map<String, dynamic> json) {
    return ActiveTripSummaryModel(
      id: json['id'] as String? ?? '',
      tripCode: json['trip_code'] as String? ?? '',
      title: json['title'] as String? ?? '',
      startLocation: json['start_location'] as String? ?? '',
      destination: json['destination'] as String? ?? '',
      status: json['status'] as String? ?? '',
      initialBalance: (json['initial_balance'] as num?)?.toDouble() ?? 0.0,
      remainingBudget: (json['remaining_budget'] as num?)?.toDouble() ?? 0.0,
      officer: json['officer'] != null ? ActiveTripOfficerModel.fromJson(json['officer'] as Map<String, dynamic>) : null,
      latestLocation: json['latest_location'] != null
          ? LatestLocationModel.fromJson(json['latest_location'] as Map<String, dynamic>)
          : null,
    );
  }
}

class ActiveTripMapPointModel {
  final String tripId;
  final String tripCode;
  final String tripTitle;
  final String officerName;
  final double latitude;
  final double longitude;
  final double? speed;
  final double? heading;
  final DateTime? recordedAt;

  ActiveTripMapPointModel({
    required this.tripId,
    required this.tripCode,
    required this.tripTitle,
    required this.officerName,
    required this.latitude,
    required this.longitude,
    this.speed,
    this.heading,
    this.recordedAt,
  });

  factory ActiveTripMapPointModel.fromJson(Map<String, dynamic> json) {
    return ActiveTripMapPointModel(
      tripId: json['trip_id'] as String? ?? '',
      tripCode: json['trip_code'] as String? ?? '',
      tripTitle: json['trip_title'] as String? ?? '',
      officerName: json['officer_name'] as String? ?? 'Petugas',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      speed: (json['speed'] as num?)?.toDouble(),
      heading: (json['heading'] as num?)?.toDouble(),
      recordedAt: json['recorded_at'] != null ? DateTime.tryParse(json['recorded_at'].toString()) : null,
    );
  }
}

class RecentActivityModel {
  final String id;
  final String type; // 'EXPENSE' | 'TRIP'
  final String title;
  final String description;
  final DateTime timestamp;
  final String status;

  RecentActivityModel({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.status,
  });

  factory RecentActivityModel.fromJson(Map<String, dynamic> json) {
    return RecentActivityModel(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'ACTIVITY',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      status: json['status'] as String? ?? '',
    );
  }
}

class CategorySpendingModel {
  final String category;
  final double totalAmount;
  final int count;
  final double percentage;

  CategorySpendingModel({
    required this.category,
    required this.totalAmount,
    required this.count,
    required this.percentage,
  });

  factory CategorySpendingModel.fromJson(Map<String, dynamic> json) {
    return CategorySpendingModel(
      category: json['category'] as String? ?? 'OTHER',
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      count: (json['count'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ManagementDashboardModel {
  final DashboardKpiModel kpis;
  final List<ActiveTripSummaryModel> activeTrips;
  final List<ActiveTripMapPointModel> activeTripMap;
  final List<RecentActivityModel> recentActivities;
  final List<CategorySpendingModel> expensesByCategory;

  ManagementDashboardModel({
    required this.kpis,
    required this.activeTrips,
    required this.activeTripMap,
    required this.recentActivities,
    required this.expensesByCategory,
  });

  factory ManagementDashboardModel.fromJson(Map<String, dynamic> json) {
    final kpisJson = json['kpis'] as Map<String, dynamic>? ?? {};
    final activeTripsJson = json['active_trips'] as List<dynamic>? ?? [];
    final activeTripMapJson = json['active_trip_map'] as List<dynamic>? ?? [];
    final recentActivitiesJson = json['recent_activities'] as List<dynamic>? ?? [];
    final expensesByCategoryJson = json['expenses_by_category'] as List<dynamic>? ?? [];

    return ManagementDashboardModel(
      kpis: DashboardKpiModel.fromJson(kpisJson),
      activeTrips: activeTripsJson
          .map((item) => ActiveTripSummaryModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      activeTripMap: activeTripMapJson
          .map((item) => ActiveTripMapPointModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      recentActivities: recentActivitiesJson
          .map((item) => RecentActivityModel.fromJson(item as Map<String, dynamic>))
          .toList(),
      expensesByCategory: expensesByCategoryJson
          .map((item) => CategorySpendingModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
