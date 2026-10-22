import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),

  // Database Configuration
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "3306", 10),
  DB_NAME: process.env.DB_NAME || "sakulajan_db",
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_DIALECT: process.env.DB_DIALECT || "mysql",
  DB_LOGGING: process.env.DB_LOGGING === "true",

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // Subscription Pricing & Trial
  TRIAL_DAYS: parseInt(process.env.TRIAL_DAYS || "30", 10),
  MONTHLY_SUBSCRIPTION_PRICE: parseFloat(
    process.env.MONTHLY_SUBSCRIPTION_PRICE || "50000",
  ),

  // Storage / Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB

  // Payment Gateway
  PAYMENT_GATEWAY: process.env.PAYMENT_GATEWAY || "MIDTRANS", // 'MIDTRANS', 'XENDIT', 'SIMULATOR'
  PAYMENT_SERVER_KEY: process.env.PAYMENT_SERVER_KEY || "",
  PAYMENT_CLIENT_KEY: process.env.PAYMENT_CLIENT_KEY || "",
  PAYMENT_IS_PRODUCTION: process.env.PAYMENT_IS_PRODUCTION === "true",
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || "",
};
