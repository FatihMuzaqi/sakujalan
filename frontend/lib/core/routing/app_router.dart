import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/dashboard/screens/management_dashboard_screen.dart';
import '../../features/trips/screens/trip_list_screen.dart';
import '../../features/trips/screens/trip_detail_screen.dart';
import '../../features/trips/screens/create_trip_screen.dart';
import '../../features/trips/screens/edit_trip_screen.dart';
import '../../features/trips/screens/trip_recap_screen.dart';
import '../../features/trips/screens/officer_home_screen.dart';
import '../../features/expenses/screens/scan_receipt_screen.dart';
import '../../features/expenses/screens/expense_list_screen.dart';
import '../../features/expenses/screens/add_expense_screen.dart';
import '../../features/expenses/screens/expense_detail_screen.dart';
import '../../features/expenses/screens/manager_approval_screen.dart';
import '../../features/expenses/screens/wallet_ledger_screen.dart';
import '../../features/tracking/screens/live_tracking_screen.dart';
import '../../features/subscription/screens/subscription_screen.dart';
import '../../features/subscription/screens/subscription_checkout_screen.dart';
import '../../features/subscription/screens/payment_history_screen.dart';
import '../../features/subscription/screens/subscription_expired_screen.dart';
import '../../features/company/screens/company_profile_screen.dart';
import '../../features/company/screens/member_list_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      final isRegistering = state.matchedLocation == '/register';
      if (!authState.isAuthenticated) {
        return (isLoggingIn || isRegistering) ? null : '/login';
      }
      if (isLoggingIn || isRegistering) {
        if (authState.user?.role == 'OFFICER') {
          return '/officer/home';
        }
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        name: 'dashboard',
        builder: (context, state) => const ManagementDashboardScreen(),
      ),
      GoRoute(
        path: '/officer/home',
        name: 'officer-home',
        builder: (context, state) => const OfficerHomeScreen(),
      ),
      GoRoute(
        path: '/trips',
        name: 'trips',
        builder: (context, state) => const TripListScreen(),
      ),
      GoRoute(
        path: '/trips/create',
        name: 'create-trip',
        builder: (context, state) => const CreateTripScreen(),
      ),
      GoRoute(
        path: '/trips/:id',
        name: 'trip-detail',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          return TripDetailScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/trips/:id/edit',
        name: 'edit-trip',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          return EditTripScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/trips/:id/recap',
        name: 'trip-recap',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          return TripRecapScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/company',
        name: 'company',
        builder: (context, state) => const CompanyProfileScreen(),
      ),
      GoRoute(
        path: '/company/members',
        name: 'company-members',
        builder: (context, state) => const MemberListScreen(),
      ),
      GoRoute(
        path: '/expenses',
        name: 'expenses',
        builder: (context, state) => const ExpenseListScreen(),
      ),
      GoRoute(
        path: '/expenses/add',
        name: 'add-expense',
        builder: (context, state) {
          final tripId = state.uri.queryParameters['tripId'] ?? (state.extra as String?);
          return AddExpenseScreen(preselectedTripId: tripId);
        },
      ),
      GoRoute(
        path: '/expenses/pending',
        name: 'pending-expenses',
        builder: (context, state) => const ManagerApprovalScreen(),
      ),
      GoRoute(
        path: '/expenses/:id',
        name: 'expense-detail',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ExpenseDetailScreen(expenseId: id);
        },
      ),
      GoRoute(
        path: '/scan-receipt',
        name: 'scan-receipt',
        builder: (context, state) {
          final tripId = state.uri.queryParameters['tripId'] ?? (state.extra as String?);
          return ScanReceiptScreen(initialTripId: tripId);
        },
      ),
      GoRoute(
        path: '/wallet/ledger',
        name: 'wallet-ledger',
        builder: (context, state) => const WalletLedgerScreen(),
      ),
      GoRoute(
        path: '/wallet/balance/:tripId',
        name: 'trip-balance',
        builder: (context, state) {
          final tripId = state.pathParameters['tripId'];
          return WalletLedgerScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/tracking/:tripId',
        name: 'tracking',
        builder: (context, state) {
          final tripId = state.pathParameters['tripId'] ?? '';
          return LiveTrackingScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/subscription',
        name: 'subscription',
        builder: (context, state) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: '/subscription/checkout',
        name: 'subscription-checkout',
        builder: (context, state) => const SubscriptionCheckoutScreen(),
      ),
      GoRoute(
        path: '/subscription/history',
        name: 'subscription-history',
        builder: (context, state) => const PaymentHistoryScreen(),
      ),
      GoRoute(
        path: '/subscription/expired',
        name: 'subscription-expired',
        builder: (context, state) => const SubscriptionExpiredScreen(),
      ),
      GoRoute(
        path: '/ledger',
        redirect: (context, state) => '/wallet/ledger',
      ),
      GoRoute(
        path: '/members',
        redirect: (context, state) => '/company/members',
      ),
    ],
  );
});
