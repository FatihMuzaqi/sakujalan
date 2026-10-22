class AppConfig {
  static const String appName = 'TripEx';
  static const String appTagline = 'Travel Expense & Realtime Monitoring System';
  static const String appVersion = '1.0.0';
  static const String logoAsset = 'assets/images/tripex_logo.png';

  // Base API configuration (Supports Android Emulator, iOS Simulator, and Web/Real Device)
  static const String defaultBaseUrl = 'https://0d1b-114-10-22-205.ngrok-free.app/api/v1';
  static const String defaultSocketUrl = 'https://0d1b-114-10-22-205.ngrok-free.app';

  static String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: defaultBaseUrl,
  );

  static String socketUrl = const String.fromEnvironment(
    'SOCKET_URL',
    defaultValue: defaultSocketUrl,
  );

  static const int connectTimeoutMs = 15000;
  static const int receiveTimeoutMs = 15000;

  // Midtrans Production Payment Gateway Configuration
  static const String midtransClientKey = String.fromEnvironment(
    'PAYMENT_CLIENT_KEY',
    defaultValue: 'Mid-client-2D5yUE8e1adQkuAQ',
  );
  static const String midtransMerchantUrl = String.fromEnvironment(
    'MIDTRANS_MERCHANT_URL',
    defaultValue: 'https://app.midtrans.com/snap/v1/transactions',
  );
  static const bool midtransIsProduction = bool.fromEnvironment(
    'PAYMENT_IS_PRODUCTION',
    defaultValue: true,
  );
}

