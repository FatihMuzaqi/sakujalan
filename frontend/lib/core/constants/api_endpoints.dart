import '../config/app_config.dart';

class ApiEndpoints {
  static String get baseUrl => AppConfig.baseUrl;
  static String get socketUrl => AppConfig.socketUrl;

  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String googleAuth = '/auth/google';
  static const String logout = '/auth/logout';
  static const String refresh = '/auth/refresh';
  static const String me = '/auth/me';

  // Company & Members
  static const String company = '/company';
  static const String companyProfile = '/company/profile';
  static const String companyMembers = '/company/members';
  static String companyMember(String id) => '/company/members/$id';
  static const String users = '/users';

  // Trips
  static const String trips = '/trips';
  static String tripDetail(String id) => '/trips/$id';
  static String assignOfficer(String id) => '/trips/$id/assign';
  static String updateTripStatus(String id) => '/trips/$id/status';
  static const String officerDashboard = '/trips/officer/dashboard';
  static String startTrip(String id) => '/trips/$id/start';
  static String completeTrip(String id) => '/trips/$id/complete';

  // Expenses & OCR
  static const String expenses = '/expenses';
  static const String expenseCategories = '/expenses/categories';
  static const String pendingExpenses = '/expenses/pending';
  static const String scanReceipt = '/expenses/scan-receipt';
  static String expenseDetail(String id) => '/expenses/$id';
  static String submitExpense(String id) => '/expenses/$id/submit';
  static String approveExpense(String id) => '/expenses/$id/approve';
  static String rejectExpense(String id) => '/expenses/$id/reject';
  static String expenseApproval(String id) => '/expenses/$id/approval';

  // Locations & GPS
  static const String logLocation = '/locations';
  static const String batchLocations = '/locations/batch';
  static String tripLocations(String tripId) => '/locations/trip/$tripId';
  static String tripLocationLatest(String tripId) => '/locations/trip/$tripId/latest';
  static String tripLocationStats(String tripId) => '/locations/trip/$tripId/stats';

  // Wallet Ledger & Subscriptions
  static const String ledger = '/wallet/ledger';
  static String tripBalance(String tripId) => '/wallet/balance/$tripId';
  static const String subscriptionStatus = '/subscriptions/status';
  static const String subscriptionCheckout = '/subscriptions/checkout';
  static const String dashboardReport = '/reports/dashboard';
}
