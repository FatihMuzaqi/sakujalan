import 'package:google_maps_flutter/google_maps_flutter.dart';

class LocationPointModel {
  final String? id;
  final String tripId;
  final String? officerId;
  final String? userId;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final double? batteryLevel;
  final DateTime recordedAt;
  final DateTime? createdAt;

  LocationPointModel({
    this.id,
    required this.tripId,
    this.officerId,
    this.userId,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.speed,
    this.heading,
    this.batteryLevel,
    required this.recordedAt,
    this.createdAt,
  });

  LatLng toLatLng() => LatLng(latitude, longitude);

  factory LocationPointModel.fromJson(Map<String, dynamic> json) {
    return LocationPointModel(
      id: json['id']?.toString(),
      tripId: json['trip_id']?.toString() ?? '',
      officerId: json['officer_id']?.toString() ?? json['user_id']?.toString(),
      userId: json['user_id']?.toString() ?? json['officer_id']?.toString(),
      latitude: (json['latitude'] is num)
          ? (json['latitude'] as num).toDouble()
          : double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: (json['longitude'] is num)
          ? (json['longitude'] as num).toDouble()
          : double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      accuracy: json['accuracy'] != null
          ? (json['accuracy'] is num ? (json['accuracy'] as num).toDouble() : double.tryParse(json['accuracy'].toString()))
          : null,
      speed: json['speed'] != null
          ? (json['speed'] is num ? (json['speed'] as num).toDouble() : double.tryParse(json['speed'].toString()))
          : null,
      heading: json['heading'] != null
          ? (json['heading'] is num ? (json['heading'] as num).toDouble() : double.tryParse(json['heading'].toString()))
          : null,
      batteryLevel: json['battery_level'] != null
          ? (json['battery_level'] is num ? (json['battery_level'] as num).toDouble() : double.tryParse(json['battery_level'].toString()))
          : null,
      recordedAt: json['recorded_at'] != null
          ? DateTime.tryParse(json['recorded_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'trip_id': tripId,
      if (officerId != null) 'officer_id': officerId,
      if (userId != null) 'user_id': userId,
      'latitude': latitude,
      'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
      if (batteryLevel != null) 'battery_level': batteryLevel,
      'recorded_at': recordedAt.toIso8601String(),
    };
  }
}

class TripLocationHistoryModel {
  final String tripId;
  final Map<String, dynamic>? officer;
  final int totalPoints;
  final List<LocationPointModel> points;

  TripLocationHistoryModel({
    required this.tripId,
    this.officer,
    required this.totalPoints,
    required this.points,
  });

  factory TripLocationHistoryModel.fromJson(Map<String, dynamic> json) {
    final list = json['points'] as List<dynamic>? ?? [];
    return TripLocationHistoryModel(
      tripId: json['trip_id']?.toString() ?? '',
      officer: json['officer'] is Map<String, dynamic> ? json['officer'] as Map<String, dynamic> : null,
      totalPoints: json['total_points'] is int ? json['total_points'] as int : list.length,
      points: list.map((item) => LocationPointModel.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }
}

class TripLocationStatsModel {
  final String tripId;
  final double totalDistanceKm;
  final double avgSpeedKmh;
  final double maxSpeedKmh;
  final int durationMinutes;
  final int pointsCount;
  final DateTime? lastRecordedAt;

  TripLocationStatsModel({
    required this.tripId,
    required this.totalDistanceKm,
    required this.avgSpeedKmh,
    required this.maxSpeedKmh,
    required this.durationMinutes,
    required this.pointsCount,
    this.lastRecordedAt,
  });

  factory TripLocationStatsModel.fromJson(Map<String, dynamic> json) {
    return TripLocationStatsModel(
      tripId: json['trip_id']?.toString() ?? '',
      totalDistanceKm: (json['total_distance_km'] is num)
          ? (json['total_distance_km'] as num).toDouble()
          : double.tryParse(json['total_distance_km']?.toString() ?? '0') ?? 0.0,
      avgSpeedKmh: (json['avg_speed_kmh'] is num)
          ? (json['avg_speed_kmh'] as num).toDouble()
          : double.tryParse(json['avg_speed_kmh']?.toString() ?? '0') ?? 0.0,
      maxSpeedKmh: (json['max_speed_kmh'] is num)
          ? (json['max_speed_kmh'] as num).toDouble()
          : double.tryParse(json['max_speed_kmh']?.toString() ?? '0') ?? 0.0,
      durationMinutes: (json['duration_minutes'] is num)
          ? (json['duration_minutes'] as num).toInt()
          : int.tryParse(json['duration_minutes']?.toString() ?? '0') ?? 0,
      pointsCount: (json['points_count'] is num)
          ? (json['points_count'] as num).toInt()
          : int.tryParse(json['points_count']?.toString() ?? '0') ?? 0,
      lastRecordedAt: json['last_recorded_at'] != null
          ? DateTime.tryParse(json['last_recorded_at'].toString())
          : null,
    );
  }
}
