enum UserRole {
  owner('OWNER'),
  admin('ADMIN'),
  manager('MANAGER'),
  officer('OFFICER');

  final String value;
  const UserRole(this.value);

  static UserRole fromString(String val) {
    return UserRole.values.firstWhere(
      (e) => e.value.toUpperCase() == val.toUpperCase(),
      orElse: () => UserRole.officer,
    );
  }
}

enum TripStatus {
  draft('DRAFT', 'Draft'),
  scheduled('SCHEDULED', 'Terjadwal'),
  active('ACTIVE', 'Berjalan'),
  completed('COMPLETED', 'Selesai'),
  cancelled('CANCELLED', 'Dibatalkan');

  final String value;
  final String label;
  const TripStatus(this.value, this.label);

  static TripStatus fromString(String val) {
    final clean = val.toUpperCase().trim();
    if (clean == 'IN_PROGRESS' || clean == 'ACTIVE') return TripStatus.active;
    if (clean == 'SCHEDULED' || clean == 'ASSIGNED') return TripStatus.scheduled;
    if (clean == 'COMPLETED') return TripStatus.completed;
    if (clean == 'CANCELLED') return TripStatus.cancelled;
    return TripStatus.draft;
  }

  bool get isDraft => this == TripStatus.draft;
  bool get isScheduled => this == TripStatus.scheduled;
  bool get isActive => this == TripStatus.active;
  bool get isCompleted => this == TripStatus.completed;
  bool get isCancelled => this == TripStatus.cancelled;
}

enum ExpenseCategory {
  fuel('FUEL', 'Bahan Bakar'),
  meals('MEALS', 'Makan & Minum'),
  toll('TOLL', 'Tol & Parkir'),
  accommodation('ACCOMMODATION', 'Penginapan'),
  transport('TRANSPORT', 'Transportasi'),
  maintenance('MAINTENANCE', 'Perawatan / Servis'),
  supplies('SUPPLIES', 'Perlengkapan'),
  other('OTHER', 'Lainnya');

  final String value;
  final String label;
  const ExpenseCategory(this.value, this.label);

  static ExpenseCategory fromString(String val) {
    return ExpenseCategory.values.firstWhere(
      (e) => e.value.toUpperCase() == val.toUpperCase(),
      orElse: () => ExpenseCategory.other,
    );
  }
}

enum ExpenseStatus {
  draft('DRAFT', 'Draft'),
  pending('PENDING', 'Menunggu Persetujuan'),
  approved('APPROVED', 'Disetujui'),
  rejected('REJECTED', 'Ditolak');

  final String value;
  final String label;
  const ExpenseStatus(this.value, this.label);

  static ExpenseStatus fromString(String val) {
    final clean = val.toUpperCase().trim();
    if (clean == 'SUBMITTED' || clean == 'PENDING') return ExpenseStatus.pending;
    if (clean == 'APPROVED') return ExpenseStatus.approved;
    if (clean == 'REJECTED') return ExpenseStatus.rejected;
    if (clean == 'DRAFT') return ExpenseStatus.draft;
    return ExpenseStatus.pending;
  }

  bool get isDraft => this == ExpenseStatus.draft;
  bool get isPending => this == ExpenseStatus.pending;
  bool get isApproved => this == ExpenseStatus.approved;
  bool get isRejected => this == ExpenseStatus.rejected;
}

enum InputMethod {
  manual('MANUAL', 'Input Manual'),
  receiptScan('RECEIPT_SCAN', 'Scan Struk (OCR)');

  final String value;
  final String label;
  const InputMethod(this.value, this.label);

  static InputMethod fromString(String val) {
    final clean = val.toUpperCase().trim();
    if (clean == 'RECEIPT_SCAN' || clean == 'OCR') return InputMethod.receiptScan;
    return InputMethod.manual;
  }
}

enum WalletTransactionType {
  initial('INITIAL', 'Alokasi Budget Awal'),
  expense('EXPENSE', 'Pemotongan Biaya'),
  disbursement('DISBURSEMENT', 'Pencairan Dana'),
  refund('REFUND', 'Pengembalian Dana'),
  topUp('TOP_UP', 'Top Up Budget');

  final String value;
  final String label;
  const WalletTransactionType(this.value, this.label);

  static WalletTransactionType fromString(String val) {
    final clean = val.toUpperCase().trim();
    if (clean == 'INITIAL' || clean == 'DISBURSEMENT') return WalletTransactionType.initial;
    if (clean == 'EXPENSE' || clean == 'EXPENSE_DEDUCTION') return WalletTransactionType.expense;
    if (clean == 'REFUND') return WalletTransactionType.refund;
    if (clean == 'TOP_UP') return WalletTransactionType.topUp;
    return WalletTransactionType.expense;
  }
}
