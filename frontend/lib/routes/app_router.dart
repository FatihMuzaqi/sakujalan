import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/trips/screens/trip_list_screen.dart';
import '../features/expenses/screens/scan_receipt_screen.dart';
import '../features/tracking/screens/live_tracking_screen.dart';
import '../features/subscription/screens/subscription_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }
      if (isLoggingIn) {
        return '/trips';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/trips',
        builder: (context, state) => const TripListScreen(),
      ),
      GoRoute(
        path: '/scan-receipt',
        builder: (context, state) => const ScanReceiptScreen(),
      ),
      GoRoute(
        path: '/tracking/:tripId',
        builder: (context, state) {
          final tripId = state.pathParameters['tripId'] ?? '';
          return LiveTrackingScreen(tripId: tripId);
        },
      ),
      GoRoute(
        path: '/subscription',
        builder: (context, state) => const SubscriptionScreen(),
      ),
    ],
  );
});
