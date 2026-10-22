export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OFFICER: 'OFFICER'
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

export const MEMBER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

export const COMPANY_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED'
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

export const BILLING_INTERVAL = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

export const TRIP_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  // Backward-compatibility aliases
  ASSIGNED: 'SCHEDULED',
  IN_PROGRESS: 'ACTIVE'
};

export const EXPENSE_CATEGORIES = [
  'TRANSPORT',
  'ACCOMMODATION',
  'MEALS',
  'FUEL',
  'TOLL',
  'SUPPLIES',
  'OTHER'
];

export const EXPENSE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  // Backward compatibility alias
  SUBMITTED: 'PENDING',
  REIMBURSED: 'APPROVED'
};

export const INPUT_METHOD = {
  MANUAL: 'MANUAL',
  RECEIPT_SCAN: 'RECEIPT_SCAN'
};

export const TRANSACTION_TYPES = {
  INITIAL: 'INITIAL',
  EXPENSE: 'EXPENSE',
  // Backward compatibility aliases
  DISBURSEMENT: 'INITIAL',
  EXPENSE_DEDUCTION: 'EXPENSE',
  REFUND: 'REFUND',
  TOP_UP: 'TOP_UP'
};

export const EXPENSE_APPROVAL_ACTION = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

export const DEFAULT_PLANS = {
  MONTHLY: {
    name: 'Monthly',
    code: 'MONTHLY',
    price: 50000.00,
    billing_interval: 'MONTHLY',
    trial_days: 30,
    max_users: 50,
    max_active_trips: 100,
    max_expenses: 1000,
    is_active: true
  }
};
