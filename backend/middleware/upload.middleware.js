import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env.js';

// Ensure directories exist
const receiptsDir = path.join(process.cwd(), ENV.UPLOAD_DIR, 'receipts');
const avatarsDir = path.join(process.cwd(), ENV.UPLOAD_DIR, 'avatars');

if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Storage for receipts
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

// Storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

// File filter for images and PDF
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF files are allowed.');
    err.statusCode = 400;
    err.errorCode = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: ENV.MAX_FILE_SIZE },
  fileFilter
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: ENV.MAX_FILE_SIZE },
  fileFilter
});
