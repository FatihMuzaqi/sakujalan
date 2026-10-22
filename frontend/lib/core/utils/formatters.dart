import 'package:intl/intl.dart';

class AppFormatters {
  /// Format an amount into IDR currency (e.g. Rp 50.000)
  static String formatCurrency(num amount) {
    try {
      return NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(amount);
    } catch (_) {
      final str = amount.toInt().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]}.',
      );
      return 'Rp $str';
    }
  }

  /// Format a standard number (e.g. 1.000)
  static String formatNumber(num number) {
    try {
      return NumberFormat.decimalPattern('id_ID').format(number);
    } catch (_) {
      return number.toInt().toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]}.',
      );
    }
  }

  /// Format DateTime into standard readable format (e.g. 05 Sep 2026, 14:30)
  static String formatDateTime(DateTime? dateTime) {
    if (dateTime == null) return '-';
    try {
      return DateFormat('dd MMM yyyy, HH:mm').format(dateTime);
    } catch (_) {
      return dateTime.toLocal().toString().substring(0, 16);
    }
  }

  /// Format DateTime into date only (e.g. 05 Sep 2026)
  static String formatDate(DateTime? dateTime) {
    if (dateTime == null) return '-';
    try {
      return DateFormat('dd MMM yyyy').format(dateTime);
    } catch (_) {
      return dateTime.toLocal().toString().substring(0, 10);
    }
  }

  /// Format DateTime into ISO-8601 string or backend compatible date string (yyyy-MM-dd)
  static String formatDateApi(DateTime dateTime) {
    try {
      return DateFormat('yyyy-MM-dd').format(dateTime);
    } catch (_) {
      return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
    }
  }

  /// Format time only (e.g. 14:30)
  static String formatTime(DateTime? dateTime) {
    if (dateTime == null) return '-';
    try {
      return DateFormat('HH:mm').format(dateTime);
    } catch (_) {
      return dateTime.toLocal().toString().substring(11, 16);
    }
  }
}

class Formatters {
  static String currency(num amount) => AppFormatters.formatCurrency(amount);
  static String number(num amount) => AppFormatters.formatNumber(amount);
  static String dateTime(DateTime? dt) => AppFormatters.formatDateTime(dt);
  static String date(DateTime? dt) => AppFormatters.formatDate(dt);
  static String time(DateTime? dt) => AppFormatters.formatTime(dt);
}
