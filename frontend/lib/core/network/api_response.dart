class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;
  final String? errorCode;
  final dynamic meta;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.errorCode,
    this.meta,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic)? fromJsonT) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      data: json['data'] != null && fromJsonT != null ? fromJsonT(json['data']) : json['data'] as T?,
      errorCode: json['error_code'],
      meta: json['meta'],
    );
  }
}
