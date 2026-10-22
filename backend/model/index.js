import { sequelize } from "../config/database.js";
import { Company } from "./Company.js";
import { User } from "./User.js";
import { CompanyMember } from "./CompanyMember.js";
import { Plan } from "./Plan.js";
import { Subscription } from "./Subscription.js";
import { Payment } from "./Payment.js";
import { PaymentWebhookLog } from "./PaymentWebhookLog.js";
import { Trip } from "./Trip.js";
import { TripMember } from "./TripMember.js";
import { TripLocation } from "./TripLocation.js";
import { Expense } from "./Expense.js";
import { ExpenseCategory } from "./ExpenseCategory.js";
import { ExpenseApproval } from "./ExpenseApproval.js";
import { WalletTransaction } from "./WalletTransaction.js";
import { ExpenseReceipt } from "./ExpenseReceipt.js";
import { ExpenseOCR } from "./ExpenseOCR.js";

// --- Company & User Direct Associations ---
Company.hasMany(User, { foreignKey: "company_id", as: "users" });
User.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- CompanyMember Associations ---
Company.hasMany(CompanyMember, { foreignKey: "company_id", as: "members" });
CompanyMember.belongsTo(Company, { foreignKey: "company_id", as: "company" });

User.hasMany(CompanyMember, { foreignKey: "user_id", as: "memberships" });
CompanyMember.belongsTo(User, { foreignKey: "user_id", as: "user" });

Company.belongsToMany(User, {
  through: CompanyMember,
  foreignKey: "company_id",
  otherKey: "user_id",
  as: "member_users",
});
User.belongsToMany(Company, {
  through: CompanyMember,
  foreignKey: "user_id",
  otherKey: "company_id",
  as: "member_companies",
});

// --- Subscription & Plan Associations ---
Plan.hasMany(Subscription, { foreignKey: "plan_id", as: "subscriptions" });
Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

// --- Company & Subscription Associations ---
Company.hasMany(Subscription, {
  foreignKey: "company_id",
  as: "subscriptions",
});
Subscription.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- Subscription & Payment Associations ---
Subscription.hasMany(Payment, {
  foreignKey: "subscription_id",
  as: "payments",
});
Payment.belongsTo(Subscription, {
  foreignKey: "subscription_id",
  as: "subscription",
});

// --- Company & Payment Associations ---
Company.hasMany(Payment, { foreignKey: "company_id", as: "payments" });
Payment.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- Trip Associations ---
Company.hasMany(Trip, { foreignKey: "company_id", as: "trips" });
Trip.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Trip.belongsTo(User, { foreignKey: "created_by", as: "creator" });
Trip.belongsTo(User, { foreignKey: "officer_id", as: "officer" });
User.hasMany(Trip, { foreignKey: "officer_id", as: "assigned_trips" });

// --- TripMember Associations ---
Trip.hasMany(TripMember, { foreignKey: "trip_id", as: "members" });
TripMember.belongsTo(Trip, { foreignKey: "trip_id", as: "trip" });
User.hasMany(TripMember, { foreignKey: "user_id", as: "trip_memberships" });
TripMember.belongsTo(User, { foreignKey: "user_id", as: "user" });

// --- TripLocation Associations ---
Company.hasMany(TripLocation, {
  foreignKey: "company_id",
  as: "trip_locations",
});
TripLocation.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Trip.hasMany(TripLocation, { foreignKey: "trip_id", as: "locations" });
TripLocation.belongsTo(Trip, { foreignKey: "trip_id", as: "trip" });
TripLocation.belongsTo(User, { foreignKey: "officer_id", as: "officer" });

// --- Expense Category Associations ---
Company.hasMany(ExpenseCategory, { foreignKey: "company_id", as: "expense_categories" });
ExpenseCategory.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- Expense Associations ---
Company.hasMany(Expense, { foreignKey: "company_id", as: "expenses" });
Expense.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Trip.hasMany(Expense, { foreignKey: "trip_id", as: "expenses" });
Expense.belongsTo(Trip, { foreignKey: "trip_id", as: "trip" });
Expense.belongsTo(User, { foreignKey: "officer_id", as: "officer" });
Expense.belongsTo(User, { foreignKey: "approved_by", as: "approver" });
Expense.belongsTo(ExpenseCategory, { foreignKey: "category_id", as: "expense_category" });
ExpenseCategory.hasMany(Expense, { foreignKey: "category_id", as: "expenses" });

// --- Expense Approval Associations ---
Expense.hasMany(ExpenseApproval, { foreignKey: "expense_id", as: "approvals" });
ExpenseApproval.belongsTo(Expense, { foreignKey: "expense_id", as: "expense" });
ExpenseApproval.belongsTo(User, { foreignKey: "approver_id", as: "approver" });
ExpenseApproval.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- Expense Receipt & OCR Associations ---
Company.hasMany(ExpenseReceipt, { foreignKey: "company_id", as: "expense_receipts" });
ExpenseReceipt.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Trip.hasMany(ExpenseReceipt, { foreignKey: "trip_id", as: "receipts" });
ExpenseReceipt.belongsTo(Trip, { foreignKey: "trip_id", as: "trip" });
Expense.hasOne(ExpenseReceipt, { foreignKey: "expense_id", as: "receipt" });
ExpenseReceipt.belongsTo(Expense, { foreignKey: "expense_id", as: "expense" });
ExpenseReceipt.belongsTo(User, { foreignKey: "user_id", as: "uploader" });

ExpenseReceipt.hasOne(ExpenseOCR, { foreignKey: "receipt_id", as: "ocr" });
ExpenseOCR.belongsTo(ExpenseReceipt, { foreignKey: "receipt_id", as: "receipt" });
Expense.hasOne(ExpenseOCR, { foreignKey: "expense_id", as: "ocr_data" });
ExpenseOCR.belongsTo(Expense, { foreignKey: "expense_id", as: "expense" });
Company.hasMany(ExpenseOCR, { foreignKey: "company_id", as: "expense_ocrs" });
ExpenseOCR.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// --- WalletTransaction Associations ---
Company.hasMany(WalletTransaction, {
  foreignKey: "company_id",
  as: "wallet_transactions",
});
WalletTransaction.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});
WalletTransaction.belongsTo(Trip, { foreignKey: "trip_id", as: "trip" });
WalletTransaction.belongsTo(User, { foreignKey: "user_id", as: "user" });

export {
  sequelize,
  Company,
  User,
  CompanyMember,
  Plan,
  Subscription,
  Payment,
  PaymentWebhookLog,
  Trip,
  TripMember,
  TripLocation,
  Expense,
  ExpenseCategory,
  ExpenseApproval,
  WalletTransaction,
  ExpenseReceipt,
  ExpenseOCR,
};
