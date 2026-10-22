import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../config/constants.js';

export const createExpenseSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  category_id: z.string().uuid().optional().nullable(),
  category: z.string().default('OTHER'),
  amount: z.union([z.number().positive('Amount must be greater than 0'), z.string().transform(v => parseFloat(v))]),
  date: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid expense date'
  }),
  description: z.string().optional().nullable(),
  input_method: z.enum(['MANUAL', 'RECEIPT_SCAN']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'SUBMITTED']).optional(),
  ocr_raw_data: z.any().optional(),
  ocr_confidence: z.union([z.number().min(0).max(1), z.string().transform(v => parseFloat(v))]).optional()
});

export const updateExpenseSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  category: z.string().optional(),
  amount: z.union([z.number().positive(), z.string().transform(v => parseFloat(v))]).optional(),
  date: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val))),
  description: z.string().optional().nullable()
});

export const rejectExpenseSchema = z.object({
  rejection_reason: z.string().trim().min(1, 'Rejection reason is required')
});

export const approveRejectExpenseSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Action must be APPROVE or REJECT' })
  }),
  rejection_reason: z.string().optional()
}).refine(data => {
  const isReject = data.action === 'REJECT' || data.action === 'REJECTED';
  if (isReject && (!data.rejection_reason || data.rejection_reason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting an expense',
  path: ['rejection_reason']
});
