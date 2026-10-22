import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sakulajan_app/core/config/app_config.dart';
import 'package:sakulajan_app/core/constants/app_enums.dart';
import 'package:sakulajan_app/core/utils/formatters.dart';
import 'package:sakulajan_app/features/company/models/company_model.dart';
import 'package:sakulajan_app/features/company/models/member_model.dart';
import 'package:sakulajan_app/features/trips/models/trip_model.dart';
import 'package:sakulajan_app/features/expenses/models/expense_model.dart';
import 'package:sakulajan_app/features/expenses/widgets/reject_reason_dialog.dart';
import 'package:sakulajan_app/shared/widgets/app_button.dart';
import 'package:sakulajan_app/shared/widgets/app_card.dart';
import 'package:sakulajan_app/shared/widgets/app_text_field.dart';
import 'package:sakulajan_app/shared/widgets/loading_view.dart';
import 'package:sakulajan_app/shared/widgets/empty_state_view.dart';
import 'package:sakulajan_app/features/tracking/models/location_model.dart';
import 'package:sakulajan_app/features/tracking/providers/location_provider.dart';
import 'package:sakulajan_app/features/expenses/models/receipt_ocr_model.dart';
import 'package:sakulajan_app/features/dashboard/models/dashboard_model.dart';
import 'package:sakulajan_app/features/subscription/models/subscription_model.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('id_ID', null);
  });

  group('Core Foundation Tests', () {
    test('AppConfig has expected defaults', () {
      expect(AppConfig.appName, equals('TripEx'));
      expect(AppConfig.appVersion, equals('1.0.0'));
      expect(AppConfig.baseUrl, isNotEmpty);
    });

    test('AppEnums parse correctly', () {
      expect(UserRole.fromString('OWNER'), equals(UserRole.owner));
      expect(UserRole.fromString('ADMIN'), equals(UserRole.admin));
      expect(UserRole.fromString('OFFICER'), equals(UserRole.officer));
      expect(UserRole.fromString('UNKNOWN'), equals(UserRole.officer));

      expect(TripStatus.fromString('IN_PROGRESS'), equals(TripStatus.active));
      expect(TripStatus.fromString('ACTIVE'), equals(TripStatus.active));
      expect(TripStatus.fromString('COMPLETED'), equals(TripStatus.completed));
      expect(TripStatus.fromString('UNKNOWN'), equals(TripStatus.draft));

      expect(ExpenseCategory.fromString('MEALS'), equals(ExpenseCategory.meals));
      expect(ExpenseCategory.fromString('UNKNOWN'), equals(ExpenseCategory.other));

      expect(ExpenseStatus.fromString('APPROVED'), equals(ExpenseStatus.approved));
    });

    test('AppFormatters formats currency correctly in IDR', () {
      final formatted = AppFormatters.formatCurrency(50000);
      expect(formatted, contains('50.000'));
      expect(formatted, contains('Rp'));
    });

    test('AppFormatters formats dates correctly', () {
      final dt = DateTime(2026, 9, 5, 14, 30);
      final formattedDate = AppFormatters.formatDate(dt);
      expect(formattedDate, contains('2026'));
      expect(formattedDate, contains('05'));

      final formattedApi = AppFormatters.formatDateApi(dt);
      expect(formattedApi, equals('2026-09-05'));
    });
  });

  group('Company & Member Models Tests', () {
    test('CompanyModel fromJson parses correctly', () {
      final json = {
        'id': 'comp-123',
        'name': 'PT Nusantara Jaya',
        'email': 'info@nusantara.com',
        'phone': '0215551234',
        'status': 'TRIAL',
        'total_members': 5,
        'created_at': '2026-09-05T12:00:00.000Z'
      };

      final model = CompanyModel.fromJson(json);
      expect(model.id, equals('comp-123'));
      expect(model.name, equals('PT Nusantara Jaya'));
      expect(model.status, equals('TRIAL'));
      expect(model.totalMembers, equals(5));
    });

    test('MemberModel fromJson parses correctly', () {
      final json = {
        'id': 'mem-456',
        'company_id': 'comp-123',
        'user_id': 'user-789',
        'name': 'Maya Manager',
        'email': 'maya@nusantara.com',
        'role': 'MANAGER',
        'status': 'ACTIVE',
        'is_active': true
      };

      final member = MemberModel.fromJson(json);
      expect(member.id, equals('mem-456'));
      expect(member.name, equals('Maya Manager'));
      expect(member.role, equals(UserRole.manager));
      expect(member.status, equals('ACTIVE'));
      expect(member.isActive, isTrue);
    });
  });

  group('Shared Widgets Tests', () {
    testWidgets('AppButton renders label and handles tap', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: 'Save Trip',
              onPressed: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Save Trip'), findsOneWidget);
      await tester.tap(find.text('Save Trip'));
      expect(tapped, isTrue);
    });

    testWidgets('AppButton shows loader when isLoading is true', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: 'Save Trip',
              isLoading: true,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AppTextField renders label and hint', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppTextField(
              label: 'Email Address',
              hint: 'user@company.com',
              controller: controller,
            ),
          ),
        ),
      );

      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('user@company.com'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), 'test@sakulajan.com');
      expect(controller.text, equals('test@sakulajan.com'));
    });

    testWidgets('AppCard renders child content', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppCard(
              child: Text('Card Content'),
            ),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
    });

    testWidgets('LoadingView renders message', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LoadingView(
              message: 'Memuat data...',
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Memuat data...'), findsOneWidget);
    });

    testWidgets('EmptyStateView renders title and button', (WidgetTester tester) async {
      bool buttonPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyStateView(
              title: 'Belum ada perjalanan',
              description: 'Buat perjalanan dinas baru untuk memulai.',
              buttonText: 'Buat Perjalanan',
              onButtonPressed: () {
                buttonPressed = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Belum ada perjalanan'), findsOneWidget);
      expect(find.text('Buat perjalanan dinas baru untuk memulai.'), findsOneWidget);
      expect(find.text('Buat Perjalanan'), findsOneWidget);

      await tester.tap(find.text('Buat Perjalanan'));
      expect(buttonPressed, isTrue);
    });
  });
  group('Phase 4: Trip Management Models & Enums Tests', () {
    test('TripStatus parses and recognizes all Phase 4 statuses', () {
      expect(TripStatus.fromString('DRAFT'), equals(TripStatus.draft));
      expect(TripStatus.fromString('SCHEDULED'), equals(TripStatus.scheduled));
      expect(TripStatus.fromString('ASSIGNED'), equals(TripStatus.scheduled));
      expect(TripStatus.fromString('ACTIVE'), equals(TripStatus.active));
      expect(TripStatus.fromString('IN_PROGRESS'), equals(TripStatus.active));
      expect(TripStatus.fromString('COMPLETED'), equals(TripStatus.completed));
      expect(TripStatus.fromString('CANCELLED'), equals(TripStatus.cancelled));

      expect(TripStatus.active.isActive, isTrue);
      expect(TripStatus.scheduled.isScheduled, isTrue);
      expect(TripStatus.draft.isDraft, isTrue);
      expect(TripStatus.completed.isCompleted, isTrue);
      expect(TripStatus.cancelled.isCancelled, isTrue);
    });

    test('TripModel fromJson parses all fields and aliases', () {
      final json = {
        'id': 'trip-001',
        'company_id': 'comp-100',
        'created_by': 'user-owner-1',
        'officer_id': 'user-officer-1',
        'trip_code': 'TRP-20260905-0001',
        'title': 'Audit Cabang Surabaya',
        'description': 'Kunjungan berkala dan review keuangan cabang.',
        'start_location': 'Jakarta HQ',
        'start_latitude': -6.2088,
        'start_longitude': 106.8456,
        'destination': 'Surabaya Branch',
        'destination_latitude': -7.2575,
        'destination_longitude': 112.7521,
        'start_at': '2026-09-10T08:00:00.000Z',
        'end_at': '2026-09-13T17:00:00.000Z',
        'initial_balance': '2500000',
        'remaining_budget': '2100000',
        'status': 'SCHEDULED',
        'officer': {
          'id': 'user-officer-1',
          'name': 'Budi Santoso',
          'email': 'budi@company.com'
        },
        'members': [
          {
            'id': 'tm-01',
            'trip_id': 'trip-001',
            'user_id': 'user-officer-1',
            'role': 'OFFICER',
            'user': {'name': 'Budi Santoso', 'email': 'budi@company.com'}
          }
        ]
      };

      final trip = TripModel.fromJson(json);
      expect(trip.id, equals('trip-001'));
      expect(trip.tripCode, equals('TRP-20260905-0001'));
      expect(trip.title, equals('Audit Cabang Surabaya'));
      expect(trip.origin, equals('Jakarta HQ'));
      expect(trip.startLocation, equals('Jakarta HQ'));
      expect(trip.destination, equals('Surabaya Branch'));
      expect(trip.initialBalance, equals(2500000.0));
      expect(trip.allocatedBudget, equals(2500000.0));
      expect(trip.remainingBudget, equals(2100000.0));
      expect(trip.status, equals(TripStatus.scheduled));
      expect(trip.officerName, equals('Budi Santoso'));
      expect(trip.members.length, equals(1));
      expect(trip.members.first.userName, equals('Budi Santoso'));
    });

    test('OfficerDashboardData fromJson parses correctly', () {
      final json = {
        'active_trip': {
          'id': 'trip-001',
          'trip_code': 'TRP-20260905-0001',
          'title': 'Audit Cabang Surabaya',
          'start_location': 'Jakarta HQ',
          'destination': 'Surabaya Branch',
          'start_at': '2026-09-10T08:00:00.000Z',
          'end_at': '2026-09-13T17:00:00.000Z',
          'initial_balance': '2500000',
          'remaining_budget': '2100000',
          'status': 'ACTIVE'
        },
        'destination': 'Surabaya Branch',
        'balance': 2100000,
        'gps_status': 'ACTIVE',
        'today_expenses': {
          'total': 350000,
          'count': 2,
          'items': []
        },
        'officer': {
          'name': 'Budi Santoso',
          'role': 'OFFICER'
        }
      };

      final data = OfficerDashboardData.fromJson(json);
      expect(data.activeTrip, isNotNull);
      expect(data.activeTrip!.status, equals(TripStatus.active));
      expect(data.destination, equals('Surabaya Branch'));
      expect(data.balance, equals(2100000.0));
      expect(data.gpsStatus, equals('ACTIVE'));
      expect(data.todayExpensesTotal, equals(350000.0));
      expect(data.todayExpensesCount, equals(2));
      expect(data.officerName, equals('Budi Santoso'));
    });
  });

  group('Phase 5: Expense, Approval & Wallet Ledger Tests', () {
    test('ExpenseStatus and InputMethod parse correctly', () {
      expect(ExpenseStatus.fromString('DRAFT'), equals(ExpenseStatus.draft));
      expect(ExpenseStatus.fromString('PENDING'), equals(ExpenseStatus.pending));
      expect(ExpenseStatus.fromString('SUBMITTED'), equals(ExpenseStatus.pending));
      expect(ExpenseStatus.fromString('APPROVED'), equals(ExpenseStatus.approved));
      expect(ExpenseStatus.fromString('REJECTED'), equals(ExpenseStatus.rejected));

      expect(ExpenseStatus.draft.isDraft, isTrue);
      expect(ExpenseStatus.pending.isPending, isTrue);
      expect(ExpenseStatus.approved.isApproved, isTrue);
      expect(ExpenseStatus.rejected.isRejected, isTrue);

      expect(InputMethod.fromString('MANUAL'), equals(InputMethod.manual));
      expect(InputMethod.fromString('RECEIPT_SCAN'), equals(InputMethod.receiptScan));
      expect(InputMethod.fromString('OCR'), equals(InputMethod.receiptScan));

      expect(WalletTransactionType.fromString('INITIAL'), equals(WalletTransactionType.initial));
      expect(WalletTransactionType.fromString('EXPENSE'), equals(WalletTransactionType.expense));
      expect(WalletTransactionType.fromString('DISBURSEMENT'), equals(WalletTransactionType.initial));
    });

    test('ExpenseModel fromJson parses correctly with approvals audit', () {
      final json = {
        'id': 'exp-001',
        'company_id': 'comp-001',
        'trip_id': 'trip-001',
        'officer_id': 'user-off-1',
        'category': 'FUEL',
        'amount': '150000',
        'input_method': 'RECEIPT_SCAN',
        'status': 'APPROVED',
        'receipt_url': '/uploads/receipts/struk.jpg',
        'description': 'Bensin Pertamax KM 57',
        'date': '2026-09-06T10:00:00.000Z',
        'ocr_confidence': 0.95,
        'trip': {
          'id': 'trip-001',
          'title': 'Audit Surabaya',
          'trip_code': 'TRP-001'
        },
        'officer': {
          'id': 'user-off-1',
          'name': 'Doni Officer'
        },
        'approvals': [
          {
            'id': 'appr-001',
            'expense_id': 'exp-001',
            'approver_id': 'user-mgr-1',
            'action': 'APPROVED',
            'approver': {'name': 'Maya Manager'},
            'created_at': '2026-09-06T11:00:00.000Z'
          }
        ]
      };

      final expense = ExpenseModel.fromJson(json);
      expect(expense.id, equals('exp-001'));
      expect(expense.category, equals('FUEL'));
      expect(expense.amount, equals(150000.0));
      expect(expense.inputMethod, equals(InputMethod.receiptScan));
      expect(expense.status, equals(ExpenseStatus.approved));
      expect(expense.tripTitle, equals('Audit Surabaya'));
      expect(expense.officerName, equals('Doni Officer'));
      expect(expense.approvals.length, equals(1));
      expect(expense.approvals.first.approverName, equals('Maya Manager'));
      expect(expense.approvals.first.action, equals('APPROVED'));
    });

    test('WalletTransactionModel & TripBalanceSummaryModel parse correctly', () {
      final txJson = {
        'id': 'tx-001',
        'trip_id': 'trip-001',
        'user_id': 'user-off-1',
        'type': 'INITIAL',
        'amount': 2000000,
        'balance_before': 0,
        'balance_after': 2000000,
        'reference_id': 'TRP-001',
        'description': 'Alokasi Budget Awal'
      };

      final tx = WalletTransactionModel.fromJson(txJson);
      expect(tx.id, equals('tx-001'));
      expect(tx.type, equals(WalletTransactionType.initial));
      expect(tx.amount, equals(2000000.0));
      expect(tx.balanceBefore, equals(0.0));
      expect(tx.balanceAfter, equals(2000000.0));
      expect(tx.isCredit, isTrue);

      final sumJson = {
        'trip_id': 'trip-001',
        'trip_code': 'TRP-001',
        'title': 'Audit Surabaya',
        'initial_balance': 2000000,
        'remaining_budget': 1850000,
        'total_spent': 150000,
        'usage_percentage': 7.5,
        'transactions_count': 2
      };

      final summary = TripBalanceSummaryModel.fromJson(sumJson);
      expect(summary.tripId, equals('trip-001'));
      expect(summary.initialBalance, equals(2000000.0));
      expect(summary.remainingBudget, equals(1850000.0));
      expect(summary.totalSpent, equals(150000.0));
      expect(summary.usagePercentage, equals(7.5));
      expect(summary.transactionsCount, equals(2));
    });

    testWidgets('RejectReasonDialog enforces non-empty reason on submission', (WidgetTester tester) async {
      String submittedReason = '';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => RejectReasonDialog(
                      expenseTitle: 'Pengeluaran BBM Rp 150.000',
                      onConfirm: (reason) {
                        submittedReason = reason;
                      },
                    ),
                  );
                },
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Tolak Pengeluaran'), findsNWidgets(2)); // Title & button
      expect(find.text('Pengeluaran BBM Rp 150.000'), findsOneWidget);

      // Submit with empty text -> Should show error validation
      await tester.tap(find.widgetWithText(ElevatedButton, 'Tolak Pengeluaran'));
      await tester.pumpAndSettle();

      expect(find.text('Alasan penolakan wajib diisi'), findsOneWidget);
      expect(submittedReason, isEmpty);

      // Enter valid reason
      await tester.enterText(find.byType(TextField), 'Struk buram tidak jelas');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Tolak Pengeluaran'));
      await tester.pumpAndSettle();

      expect(submittedReason, equals('Struk buram tidak jelas'));
    });
  });

  group('Phase 6: Realtime GPS Tracking Models & Providers Tests', () {
    test('LocationPointModel fromJson and toJson serialize correctly', () {
      final json = {
        'id': 'loc-001',
        'trip_id': 'trip-100',
        'officer_id': 'user-off-1',
        'user_id': 'user-off-1',
        'latitude': -6.2088,
        'longitude': 106.8456,
        'accuracy': 5.5,
        'speed': 12.3,
        'heading': 180.0,
        'battery_level': 88.0,
        'recorded_at': '2026-09-06T12:00:00.000Z',
      };

      final point = LocationPointModel.fromJson(json);
      expect(point.id, equals('loc-001'));
      expect(point.tripId, equals('trip-100'));
      expect(point.officerId, equals('user-off-1'));
      expect(point.latitude, equals(-6.2088));
      expect(point.longitude, equals(106.8456));
      expect(point.accuracy, equals(5.5));
      expect(point.speed, equals(12.3));
      expect(point.heading, equals(180.0));
      expect(point.batteryLevel, equals(88.0));
      expect(point.toLatLng().latitude, equals(-6.2088));
      expect(point.toLatLng().longitude, equals(106.8456));

      final serialized = point.toJson();
      expect(serialized['trip_id'], equals('trip-100'));
      expect(serialized['latitude'], equals(-6.2088));
      expect(serialized['longitude'], equals(106.8456));
      expect(serialized['speed'], equals(12.3));
      expect(serialized['heading'], equals(180.0));
    });

    test('TripLocationHistoryModel parses point list and officer details', () {
      final json = {
        'trip_id': 'trip-100',
        'total_points': 2,
        'officer': {
          'id': 'user-off-1',
          'name': 'Doni Driver Officer'
        },
        'points': [
          {
            'id': 'p-1',
            'trip_id': 'trip-100',
            'latitude': -6.2088,
            'longitude': 106.8456,
            'recorded_at': '2026-09-06T12:00:00.000Z'
          },
          {
            'id': 'p-2',
            'trip_id': 'trip-100',
            'latitude': -6.2099,
            'longitude': 106.8467,
            'recorded_at': '2026-09-06T12:01:00.000Z'
          }
        ]
      };

      final history = TripLocationHistoryModel.fromJson(json);
      expect(history.tripId, equals('trip-100'));
      expect(history.totalPoints, equals(2));
      expect(history.officer?['name'], equals('Doni Driver Officer'));
      expect(history.points.length, equals(2));
      expect(history.points[0].latitude, equals(-6.2088));
      expect(history.points[1].latitude, equals(-6.2099));
    });

    test('TripLocationStatsModel parses statistics accurately', () {
      final json = {
        'trip_id': 'trip-100',
        'total_distance_km': 15.42,
        'avg_speed_kmh': 45.6,
        'max_speed_kmh': 72.0,
        'duration_minutes': 28,
        'points_count': 120,
        'last_recorded_at': '2026-09-06T12:30:00.000Z'
      };

      final stats = TripLocationStatsModel.fromJson(json);
      expect(stats.tripId, equals('trip-100'));
      expect(stats.totalDistanceKm, equals(15.42));
      expect(stats.avgSpeedKmh, equals(45.6));
      expect(stats.maxSpeedKmh, equals(72.0));
      expect(stats.durationMinutes, equals(28));
      expect(stats.pointsCount, equals(120));
      expect(stats.lastRecordedAt, isNotNull);
    });

    test('LocationTrackerState transitions and buffer updates', () {
      final initialState = LocationTrackerState();
      expect(initialState.isStreaming, isFalse);
      expect(initialState.status, equals(TrackingStatus.idle));
      expect(initialState.offlineBuffer, isEmpty);

      final streamingState = initialState.copyWith(
        isStreaming: true,
        status: TrackingStatus.streaming,
        activeTripId: 'trip-100',
      );
      expect(streamingState.isStreaming, isTrue);
      expect(streamingState.status, equals(TrackingStatus.streaming));
      expect(streamingState.activeTripId, equals('trip-100'));

      final offlinePoint = LocationPointModel(
        tripId: 'trip-100',
        latitude: -6.2088,
        longitude: 106.8456,
        recordedAt: DateTime.now(),
      );
      final bufferedState = streamingState.copyWith(
        status: TrackingStatus.offline,
        offlineBuffer: [offlinePoint],
      );
      expect(bufferedState.status, equals(TrackingStatus.offline));
      expect(bufferedState.offlineBuffer.length, equals(1));
    });
  });

  group('Phase 7: Receipt OCR & AI Models Tests', () {
    test('ExpenseReceiptModel parses JSON and serializes correctly', () {
      final json = {
        'id': 'rcpt-101',
        'company_id': 'comp-01',
        'trip_id': 'trip-01',
        'expense_id': 'exp-01',
        'user_id': 'user-off-1',
        'file_name': 'receipt-123.jpg',
        'file_path': '/var/uploads/receipts/receipt-123.jpg',
        'file_url': '/uploads/receipts/receipt-123.jpg',
        'file_size': 204800,
        'mime_type': 'image/jpeg',
        'created_at': '2026-09-06T12:00:00.000Z'
      };

      final receipt = ExpenseReceiptModel.fromJson(json);
      expect(receipt.id, equals('rcpt-101'));
      expect(receipt.fileName, equals('receipt-123.jpg'));
      expect(receipt.fileUrl, equals('/uploads/receipts/receipt-123.jpg'));
      expect(receipt.fileSize, equals(204800));
      expect(receipt.mimeType, equals('image/jpeg'));

      final serialized = receipt.toJson();
      expect(serialized['id'], equals('rcpt-101'));
      expect(serialized['file_name'], equals('receipt-123.jpg'));
    });

    test('OcrParsedDataModel parses structured AI extraction data', () {
      final json = {
        'raw_text': 'SPBU PERTAMINA\nTOTAL: Rp 150.000',
        'confidence': 0.92,
        'status': 'SUCCESS',
        'merchant': 'SPBU PERTAMINA KM 57',
        'amount': 150000,
        'subtotal': 135000,
        'tax': 15000,
        'discount': 0,
        'transaction_date': '2026-09-06T10:00:00.000Z',
        'description': 'BBM - SPBU PERTAMINA KM 57',
        'category': 'FUEL',
        'is_blurry': false,
        'items': [
          {'name': 'Pertamax', 'price': 150000, 'qty': 1}
        ]
      };

      final parsed = OcrParsedDataModel.fromJson(json);
      expect(parsed.merchant, equals('SPBU PERTAMINA KM 57'));
      expect(parsed.amount, equals(150000.0));
      expect(parsed.subtotal, equals(135000.0));
      expect(parsed.tax, equals(15000.0));
      expect(parsed.category, equals('FUEL'));
      expect(parsed.confidence, equals(0.92));
      expect(parsed.isBlurry, isFalse);
      expect(parsed.items.length, equals(1));
    });

    test('OcrParsedDataModel recognizes blurry and low confidence receipts', () {
      final json = {
        'raw_text': '???',
        'confidence': 0.35,
        'status': 'PARTIAL',
        'merchant': 'Merchant Umum',
        'amount': 0,
        'transaction_date': '2026-09-06T10:00:00.000Z',
        'description': 'Catatan pengeluaran',
        'category': 'OTHER',
        'is_blurry': true,
      };

      final parsed = OcrParsedDataModel.fromJson(json);
      expect(parsed.confidence, equals(0.35));
      expect(parsed.isBlurry, isTrue);
      expect(parsed.status, equals('PARTIAL'));
    });

    test('ExpenseOcrModel parses nested structured data and confidence', () {
      final json = {
        'id': 'ocr-01',
        'receipt_id': 'rcpt-101',
        'company_id': 'comp-01',
        'raw_text': 'RAW RECEIPT TEXT',
        'confidence': 0.95,
        'ai_model': 'hybrid_ocr_ai_v2',
        'status': 'SUCCESS',
        'structured_data': {
          'merchant': 'RM PADANG SEDAP',
          'amount': 45000,
          'category': 'MEALS',
          'confidence': 0.95,
          'status': 'SUCCESS',
          'transaction_date': '2026-09-06T13:00:00.000Z',
          'description': 'Makan Siang'
        }
      };

      final ocr = ExpenseOcrModel.fromJson(json);
      expect(ocr.id, equals('ocr-01'));
      expect(ocr.aiModel, equals('hybrid_ocr_ai_v2'));
      expect(ocr.structuredData.merchant, equals('RM PADANG SEDAP'));
      expect(ocr.structuredData.amount, equals(45000.0));
      expect(ocr.structuredData.category, equals('MEALS'));
    });
  });

  group('PHASE 8: Dashboard & Realtime Monitoring Models Tests', () {
    test('DashboardKpiModel parses comprehensive KPI metrics', () {
      final json = {
        'active_trips_count': 3,
        'scheduled_trips_count': 2,
        'completed_trips_count': 10,
        'total_trips_count': 15,
        'pending_expenses_count': 4,
        'pending_expenses_amount': 750000.0,
        'total_spending': 4500000.0,
        'remaining_budget': 5500000.0,
        'total_allocated_budget': 10000000.0,
        'active_officers_count': 3,
        'total_officers_count': 5,
        'utilization_percentage': 45.0,
      };

      final kpis = DashboardKpiModel.fromJson(json);
      expect(kpis.activeTripsCount, equals(3));
      expect(kpis.scheduledTripsCount, equals(2));
      expect(kpis.totalTripsCount, equals(15));
      expect(kpis.pendingExpensesCount, equals(4));
      expect(kpis.pendingExpensesAmount, equals(750000.0));
      expect(kpis.totalSpending, equals(4500000.0));
      expect(kpis.remainingBudget, equals(5500000.0));
      expect(kpis.totalAllocatedBudget, equals(10000000.0));
      expect(kpis.activeOfficersCount, equals(3));
      expect(kpis.utilizationPercentage, equals(45.0));
    });

    test('ManagementDashboardModel parses full JSON payload with associations', () {
      final json = {
        'kpis': {
          'active_trips_count': 1,
          'scheduled_trips_count': 1,
          'completed_trips_count': 5,
          'total_trips_count': 7,
          'pending_expenses_count': 2,
          'pending_expenses_amount': 300000.0,
          'total_spending': 1200000.0,
          'remaining_budget': 1800000.0,
          'total_allocated_budget': 3000000.0,
          'active_officers_count': 1,
          'total_officers_count': 3,
          'utilization_percentage': 40.0,
        },
        'active_trips': [
          {
            'id': 'trip-001',
            'trip_code': 'TRP-001',
            'title': 'Pengiriman Logistik Surabaya',
            'start_location': 'Jakarta Hub',
            'destination': 'Surabaya',
            'status': 'ACTIVE',
            'initial_balance': 2000000.0,
            'remaining_budget': 1200000.0,
            'officer': {
              'id': 'usr-off-1',
              'name': 'Budi Driver',
              'email': 'budi@company.com',
            },
            'latest_location': {
              'latitude': -6.2088,
              'longitude': 106.8456,
              'speed': 45.0,
              'heading': 90.0,
              'recorded_at': '2026-09-06T10:00:00.000Z',
            }
          }
        ],
        'active_trip_map': [
          {
            'trip_id': 'trip-001',
            'trip_code': 'TRP-001',
            'trip_title': 'Pengiriman Logistik Surabaya',
            'officer_name': 'Budi Driver',
            'latitude': -6.2088,
            'longitude': 106.8456,
            'speed': 45.0,
            'heading': 90.0,
            'recorded_at': '2026-09-06T10:00:00.000Z',
          }
        ],
        'recent_activities': [
          {
            'id': 'act-001',
            'type': 'EXPENSE',
            'title': 'Pengeluaran Disetujui (Rp 200.000)',
            'description': 'Budi Driver di Pengiriman Logistik Surabaya',
            'timestamp': '2026-09-06T10:30:00.000Z',
            'status': 'APPROVED'
          }
        ],
        'expenses_by_category': [
          {
            'category': 'FUEL',
            'total_amount': 500000.0,
            'count': 3,
            'percentage': 41.7
          }
        ]
      };

      final dashboard = ManagementDashboardModel.fromJson(json);
      expect(dashboard.kpis.activeTripsCount, equals(1));
      expect(dashboard.activeTrips.length, equals(1));
      expect(dashboard.activeTrips.first.officer?.name, equals('Budi Driver'));
      expect(dashboard.activeTrips.first.latestLocation?.latitude, equals(-6.2088));
      expect(dashboard.activeTripMap.length, equals(1));
      expect(dashboard.recentActivities.length, equals(1));
      expect(dashboard.recentActivities.first.type, equals('EXPENSE'));
      expect(dashboard.expensesByCategory.length, equals(1));
      expect(dashboard.expensesByCategory.first.category, equals('FUEL'));
    });
  });

  group('PHASE 9: Subscription, Trial & Payment Models Tests', () {
    test('SubscriptionPlanModel & SubscriptionStatusInfo parse trial and plan details', () {
      final json = {
        'status': 'TRIAL',
        'is_active': true,
        'is_read_only': false,
        'days_remaining': 28,
        'trial_ends_at': '2026-10-04T10:00:00.000Z',
        'plan': {
          'name': 'Monthly Plan',
          'code': 'MONTHLY',
          'price': 50000.0
        }
      };

      final statusInfo = SubscriptionStatusInfo.fromJson(json);
      expect(statusInfo.status, equals('TRIAL'));
      expect(statusInfo.isActive, isTrue);
      expect(statusInfo.isReadOnly, isFalse);
      expect(statusInfo.daysRemaining, equals(28));
      expect(statusInfo.plan?.price, equals(50000.0));
      expect(statusInfo.plan?.code, equals('MONTHLY'));
    });

    test('SubscriptionResponseModel parses company, subscription, and status info', () {
      final json = {
        'company': {
          'id': 'comp-01',
          'name': 'PT Nusantara Logistik',
          'status': 'ACTIVE'
        },
        'subscription': {
          'id': 'sub-01',
          'company_id': 'comp-01',
          'plan_id': 'plan-01',
          'status': 'ACTIVE',
          'current_period_start': '2026-09-06T10:00:00.000Z',
          'current_period_end': '2026-10-06T10:00:00.000Z'
        },
        'plan': {
          'name': 'Monthly Plan',
          'code': 'MONTHLY',
          'price': 50000.0
        },
        'status_info': {
          'status': 'ACTIVE',
          'is_active': true,
          'is_read_only': false,
          'days_remaining': 30
        }
      };

      final response = SubscriptionResponseModel.fromJson(json);
      expect(response.company.name, equals('PT Nusantara Logistik'));
      expect(response.subscription?.status, equals('ACTIVE'));
      expect(response.statusInfo.isActive, isTrue);
      expect(response.plan?.price, equals(50000.0));
    });

    test('PaymentModel & CheckoutResponseModel parse invoice and transaction details', () {
      final paymentJson = {
        'id': 'pay-001',
        'gateway_order_id': 'INV-20260906-1234',
        'amount': 50000.0,
        'currency': 'IDR',
        'payment_gateway': 'SIMULATOR',
        'payment_method': 'QRIS',
        'status': 'PAID',
        'paid_at': '2026-09-06T10:30:00.000Z',
        'created_at': '2026-09-06T10:00:00.000Z'
      };

      final payment = PaymentModel.fromJson(paymentJson);
      expect(payment.invoiceNumber, equals('INV-20260906-1234'));
      expect(payment.amount, equals(50000.0));
      expect(payment.status, equals('PAID'));
      expect(payment.paymentMethod, equals('QRIS'));

      final checkoutJson = {
        'checkout_info': {
          'invoice_number': 'INV-20260906-1234',
          'amount': 50000.0,
          'plan_name': 'Monthly Plan',
          'plan_code': 'MONTHLY',
          'payment_method': 'QRIS',
          'payment_url': '/webhooks/pay-simulator/INV-20260906-1234'
        }
      };

      final checkout = CheckoutResponseModel.fromJson(checkoutJson);
      expect(checkout.invoiceNumber, equals('INV-20260906-1234'));
      expect(checkout.amount, equals(50000.0));
      expect(checkout.paymentUrl, contains('INV-20260906-1234'));
    });
  });
}

