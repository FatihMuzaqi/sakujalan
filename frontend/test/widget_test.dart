import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sakulajan_app/main.dart';

void main() {
  testWidgets('TripExApp initializes without crash', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: TripExApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(TripExApp), findsOneWidget);
  });
}
