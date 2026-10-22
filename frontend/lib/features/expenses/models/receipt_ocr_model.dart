class ExpenseReceiptModel {
  final String id;
  final String companyId;
  final String? tripId;
  final String? expenseId;
  final String userId;
  final String fileName;
  final String filePath;
  final String fileUrl;
  final int? fileSize;
  final String mimeType;
  final DateTime createdAt;

  ExpenseReceiptModel({
    required this.id,
    required this.companyId,
    this.tripId,
    this.expenseId,
    required this.userId,
    required this.fileName,
    required this.filePath,
    required this.fileUrl,
    this.fileSize,
    required this.mimeType,
    required this.createdAt,
  });

  factory ExpenseReceiptModel.fromJson(Map<String, dynamic> json) {
    return ExpenseReceiptModel(
      id: json['id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      tripId: json['trip_id']?.toString(),
      expenseId: json['expense_id']?.toString(),
      userId: json['user_id']?.toString() ?? '',
      fileName: json['file_name']?.toString() ?? '',
      filePath: json['file_path']?.toString() ?? '',
      fileUrl: json['file_url']?.toString() ?? '',
      fileSize: json['file_size'] is int ? json['file_size'] as int : int.tryParse(json['file_size']?.toString() ?? ''),
      mimeType: json['mime_type']?.toString() ?? 'image/jpeg',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'company_id': companyId,
      if (tripId != null) 'trip_id': tripId,
      if (expenseId != null) 'expense_id': expenseId,
      'user_id': userId,
      'file_name': fileName,
      'file_path': filePath,
      'file_url': fileUrl,
      if (fileSize != null) 'file_size': fileSize,
      'mime_type': mimeType,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class OcrParsedDataModel {
  final String rawText;
  final double confidence;
  final String status;
  final String merchant;
  final double amount;
  final double subtotal;
  final double tax;
  final double discount;
  final DateTime transactionDate;
  final String description;
  final String category;
  final bool isBlurry;
  final List<Map<String, dynamic>> items;

  OcrParsedDataModel({
    this.rawText = '',
    required this.confidence,
    required this.status,
    required this.merchant,
    required this.amount,
    this.subtotal = 0.0,
    this.tax = 0.0,
    this.discount = 0.0,
    required this.transactionDate,
    required this.description,
    required this.category,
    this.isBlurry = false,
    this.items = const [],
  });

  factory OcrParsedDataModel.fromJson(Map<String, dynamic> json) {
    return OcrParsedDataModel(
      rawText: json['raw_text']?.toString() ?? '',
      confidence: (json['confidence'] is num)
          ? (json['confidence'] as num).toDouble()
          : double.tryParse(json['confidence']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'SUCCESS',
      merchant: json['merchant']?.toString() ?? 'Merchant Umum',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0') ?? 0.0,
      tax: (json['tax'] is num)
          ? (json['tax'] as num).toDouble()
          : double.tryParse(json['tax']?.toString() ?? '0') ?? 0.0,
      discount: (json['discount'] is num)
          ? (json['discount'] as num).toDouble()
          : double.tryParse(json['discount']?.toString() ?? '0') ?? 0.0,
      transactionDate: json['transaction_date'] != null
          ? DateTime.tryParse(json['transaction_date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'OTHER',
      isBlurry: json['is_blurry'] == true,
      items: json['items'] is List ? List<Map<String, dynamic>>.from(json['items']) : [],
    );
  }
}

class ExpenseOcrModel {
  final String id;
  final String receiptId;
  final String companyId;
  final String? expenseId;
  final String? rawText;
  final OcrParsedDataModel structuredData;
  final double confidence;
  final String aiModel;
  final String status;

  ExpenseOcrModel({
    required this.id,
    required this.receiptId,
    required this.companyId,
    this.expenseId,
    this.rawText,
    required this.structuredData,
    required this.confidence,
    required this.aiModel,
    required this.status,
  });

  factory ExpenseOcrModel.fromJson(Map<String, dynamic> json) {
    return ExpenseOcrModel(
      id: json['id']?.toString() ?? '',
      receiptId: json['receipt_id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      expenseId: json['expense_id']?.toString(),
      rawText: json['raw_text']?.toString(),
      structuredData: json['structured_data'] != null
          ? OcrParsedDataModel.fromJson(json['structured_data'] as Map<String, dynamic>)
          : OcrParsedDataModel(
              confidence: 0,
              status: 'FAILED',
              merchant: '',
              amount: 0,
              transactionDate: DateTime.now(),
              description: '',
              category: 'OTHER',
            ),
      confidence: (json['confidence'] is num)
          ? (json['confidence'] as num).toDouble()
          : double.tryParse(json['confidence']?.toString() ?? '0') ?? 0.0,
      aiModel: json['ai_model']?.toString() ?? 'hybrid_ocr_ai',
      status: json['status']?.toString() ?? 'SUCCESS',
    );
  }
}
