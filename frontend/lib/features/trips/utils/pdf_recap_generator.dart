import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/trip_model.dart';
import '../../expenses/models/expense_model.dart';
import '../../tracking/models/location_model.dart';

class PdfRecapGenerator {
  static final _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static Future<void> generateAndPrintPdf({
    required TripModel trip,
    required List<ExpenseModel> expenses,
    TripLocationStatsModel? stats,
  }) async {
    final pdfBytes = await buildPdf(
      trip: trip,
      expenses: expenses,
      stats: stats,
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'Rekap_Perjalanan_${trip.tripCode}.pdf',
    );
  }

  static Future<Uint8List> buildPdf({
    required TripModel trip,
    required List<ExpenseModel> expenses,
    TripLocationStatsModel? stats,
  }) async {
    final pdf = pw.Document();

    final totalBudget = trip.initialBalance;

    final approvedSpent = expenses
        .where((e) => e.isApproved)
        .fold(0.0, (sum, e) => sum + e.amount);

    final pendingSpent = expenses
        .where((e) => e.isPending)
        .fold(0.0, (sum, e) => sum + e.amount);

    final remainingBudget = totalBudget - approvedSpent;

    final totalDistanceKm = stats?.totalDistanceKm ?? 0.0;

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return [
            // 1. Header Banner
            pw.Container(
              padding: const pw.EdgeInsets.all(16),
              decoration: pw.BoxDecoration(
                color: PdfColors.blue900,
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'TripEx - Laporan Rekapitulasi Perjalanan',
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 18,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Sistem Manajemen Dinas & Realisasi Anggaran Perjalanan',
                        style: const pw.TextStyle(
                          color: PdfColors.blue100,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        trip.tripCode,
                        style: pw.TextStyle(
                          color: PdfColors.amber300,
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        'Status: ${trip.status.label}',
                        style: const pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 20),

            // 2. Info Detail Perjalanan
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
                borderRadius: pw.BorderRadius.circular(6),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'DETAIL PERJALANAN DINAS',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.blue800,
                    ),
                  ),
                  pw.Divider(color: PdfColors.grey300, thickness: 0.5),
                  pw.SizedBox(height: 6),
                  pw.Row(
                    children: [
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            _buildInfoText('Judul Perjalanan', trip.title),
                            pw.SizedBox(height: 4),
                            _buildInfoText('Kota Asal', trip.startLocation),
                            pw.SizedBox(height: 4),
                            _buildInfoText('Kota Tujuan', trip.destination),
                          ],
                        ),
                      ),
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            _buildInfoText('Petugas / Officer', trip.officerName ?? 'Petugas Lapangan'),
                            pw.SizedBox(height: 4),
                            _buildInfoText(
                              'Tanggal Berangkat',
                              DateFormat('dd MMM yyyy').format(trip.startAt),
                            ),
                            pw.SizedBox(height: 4),
                            _buildInfoText(
                              'Tanggal Kembali',
                              DateFormat('dd MMM yyyy').format(trip.endAt),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 16),

            // 3. Ringkasan Finansial & Tracking Metrics
            pw.Row(
              children: [
                pw.Expanded(
                  child: _buildMetricBox(
                    title: 'Total Anggaran',
                    value: _currencyFormat.format(totalBudget),
                    color: PdfColors.blue700,
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  child: _buildMetricBox(
                    title: 'Disetujui (Terpakai)',
                    value: _currencyFormat.format(approvedSpent),
                    color: PdfColors.green700,
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  child: _buildMetricBox(
                    title: 'Sisa Anggaran',
                    value: _currencyFormat.format(remainingBudget),
                    color: remainingBudget >= 0 ? PdfColors.blue800 : PdfColors.red700,
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  child: _buildMetricBox(
                    title: 'Jarak GPS',
                    value: '${totalDistanceKm.toStringAsFixed(1)} km',
                    color: PdfColors.orange800,
                  ),
                ),
              ],
            ),
            if (pendingSpent > 0) ...[
              pw.SizedBox(height: 8),
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  color: PdfColors.amber50,
                  border: pw.Border.all(color: PdfColors.amber300),
                  borderRadius: pw.BorderRadius.circular(4),
                ),
                child: pw.Row(
                  children: [
                    pw.Text(
                      '⚠️ Pengeluaran Dalam Antrean Persetujuan (Pending): ',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                    ),
                    pw.Text(
                      _currencyFormat.format(pendingSpent),
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: PdfColors.orange900),
                    ),
                  ],
                ),
              ),
            ],
            pw.SizedBox(height: 20),

            // 4. Tabel Input Struk & Lokasi GPS
            pw.Text(
              'HISTORI & RINCIAN PENGELUARAN STRUK',
              style: pw.TextStyle(
                fontSize: 12,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.blue800,
              ),
            ),
            pw.SizedBox(height: 8),
            expenses.isEmpty
                ? pw.Container(
                    padding: const pw.EdgeInsets.all(16),
                    alignment: pw.Alignment.center,
                    child: pw.Text(
                      'Belum ada rincian pengeluaran struk yang dicatat.',
                      style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
                    ),
                  )
                : pw.TableHelper.fromTextArray(
                    headers: ['No', 'Tanggal', 'Kategori', 'Keterangan', 'Koordinat GPS', 'Status', 'Nominal (Rp)'],
                    headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
                    headerDecoration: const pw.BoxDecoration(color: PdfColors.blue800),
                    cellStyle: const pw.TextStyle(fontSize: 8),
                    cellAlignment: pw.Alignment.centerLeft,
                    data: List<List<dynamic>>.generate(
                      expenses.length,
                      (index) {
                        final e = expenses[index];
                        final gpsText = (e.latitude != null && e.longitude != null)
                            ? '${e.latitude!.toStringAsFixed(4)}, ${e.longitude!.toStringAsFixed(4)}'
                            : 'Tanpa GPS';
                        return [
                          '${index + 1}',
                          DateFormat('dd/MM/yy HH:mm').format(e.date ?? e.createdAt),
                          e.category,
                          e.description ?? '-',
                          gpsText,
                          e.status.label,
                          _currencyFormat.format(e.amount),
                        ];
                      },
                    ),
                  ),
            pw.SizedBox(height: 30),

            // 5. Verification & Signature Block
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text('Petugas Lapangan', style: const pw.TextStyle(fontSize: 10)),
                    pw.SizedBox(height: 40),
                    pw.Text(
                      '( ${trip.officerName ?? 'Officer'} )',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text('Mengetahui / Manager', style: const pw.TextStyle(fontSize: 10)),
                    pw.SizedBox(height: 40),
                    pw.Text(
                      '( Manager Approver )',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ];
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _buildInfoText(String label, String value) {
    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(
          width: 100,
          child: pw.Text(
            '$label:',
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
          ),
        ),
        pw.Expanded(
          child: pw.Text(
            value,
            style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
          ),
        ),
      ],
    );
  }

  static pw.Widget _buildMetricBox({
    required String title,
    required String value,
    required PdfColor color,
  }) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(8),
      decoration: pw.BoxDecoration(
        color: PdfColors.grey100,
        border: pw.Border.all(color: PdfColors.grey300),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            title,
            style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            value,
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
