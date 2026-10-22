import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sakulajan_app/core/theme/app_theme.dart';
import 'package:sakulajan_app/features/auth/providers/auth_provider.dart';
import 'package:sakulajan_app/features/dashboard/models/dashboard_model.dart';
import 'package:sakulajan_app/features/dashboard/providers/dashboard_provider.dart';
import 'package:sakulajan_app/features/dashboard/screens/management_dashboard_screen.dart';
import 'package:sakulajan_app/features/subscription/models/subscription_model.dart';
import 'package:sakulajan_app/features/subscription/providers/subscription_provider.dart';

void main() {
  testWidgets('ManagementDashboardScreen renders all sections without error', (WidgetTester tester) async {
    final mockDashboard = ManagementDashboardModel(
      kpis: DashboardKpiModel(
        activeTripsCount: 1,
        scheduledTripsCount: 0,
        completedTripsCount: 0,
        totalTripsCount: 1,
        pendingExpensesCount: 0,
        pendingExpensesAmount: 0,
        totalSpending: 350000,
        remainingBudget: 3150000,
        totalAllocatedBudget: 0,
        activeOfficersCount: 1,
        totalOfficersCount: 1,
        utilizationPercentage: 0,
      ),
      activeTrips: [
        ActiveTripSummaryModel(
          id: '1',
          tripCode: 'TRP-1',
          title: 'Audit Lapangan Bandung',
          startLocation: 'Jakarta',
          destination: 'Bandung',
          status: 'ACTIVE',
          initialBalance: 0,
          remainingBudget: 3150000,
          officer: ActiveTripOfficerModel(id: 'off-1', name: 'Rian Pratama'),
        )
      ],
      activeTripMap: [],
      recentActivities: [
        RecentActivityModel(
          id: 'act-1',
          type: 'EXPENSE',
          title: 'Pengeluaran Disetujui',
          description: 'Rian Pratama',
          timestamp: DateTime.now(),
          status: 'APPROVED',
        )
      ],
      expensesByCategory: [
        CategorySpendingModel(
          category: 'FUEL',
          totalAmount: 350000,
          count: 1,
          percentage: 100,
        )
      ],
    );

    final mockSubscription = SubscriptionResponseModel(
      company: SubscriptionCompanyModel(id: 'c1', name: 'PT Nusantara', status: 'TRIAL'),
      statusInfo: SubscriptionStatusInfo(
        status: 'TRIAL',
        isActive: true,
        isReadOnly: false,
        daysRemaining: 30,
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith((ref) => AuthNotifier()),
          managementDashboardProvider.overrideWith(() => MockDashboardNotifier(mockDashboard)),
          subscriptionStatusProvider.overrideWith(() => MockSubscriptionNotifier(mockSubscription)),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const ManagementDashboardScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Header status card
    expect(find.text('1 Perjalanan Sedang Berlangsung'), findsOneWidget);
    // Verify KPI cards
    expect(find.text('Trip Aktif'), findsOneWidget);
    expect(find.text('Pending Review'), findsOneWidget);
    expect(find.text('Total Pengeluaran'), findsOneWidget);
    expect(find.text('Sisa Saldo Kas'), findsOneWidget);
    // Verify Active Trips
    expect(find.text('Audit Lapangan Bandung'), findsOneWidget);
  });
}

class MockDashboardNotifier extends ManagementDashboardNotifier {
  final ManagementDashboardModel _data;
  MockDashboardNotifier(this._data);

  @override
  Future<ManagementDashboardModel> build() async => _data;
}

class MockSubscriptionNotifier extends SubscriptionStatusNotifier {
  final SubscriptionResponseModel _data;
  MockSubscriptionNotifier(this._data);

  @override
  Future<SubscriptionResponseModel> build() async => _data;
}
