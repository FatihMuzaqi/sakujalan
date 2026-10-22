import { sequelize, ExpenseReceipt, ExpenseOCR, Expense, ExpenseCategory, Trip } from '../model/index.js';
import { parseReceiptImage } from './ocr.service.js';
import { EXPENSE_STATUS, INPUT_METHOD, ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.util.js';

/**
 * Handles receipt upload, OCR extraction, AI parsing, and draft expense generation
 * @param {object} params
 * @param {string} params.companyId
 * @param {string} params.tripId
 * @param {object} params.user
 * @param {object} params.file - Multer file object
 * @param {boolean} [params.autoCreateDraft=true]
 * @returns {Promise<object>}
 */
export const processReceiptScan = async ({
  companyId,
  tripId,
  user,
  file,
  autoCreateDraft = true
}) => {
  if (!file) {
    const err = new Error('Receipt image file is required for OCR scanning');
    err.statusCode = 400;
    throw err;
  }

  // Validate Trip if provided
  let trip = null;
  if (tripId) {
    trip = await Trip.findOne({
      where: { id: tripId, company_id: companyId }
    });
    if (!trip) {
      const err = new Error('Trip not found or does not belong to your company');
      err.statusCode = 404;
      throw err;
    }
  }

  // 1. Run OCR and AI Parsing
  const parsedOcr = await parseReceiptImage(file.path, file.originalname);
  const fileUrl = `/uploads/receipts/${file.filename}`;

  // 2. Perform Database Transactions
  const result = await sequelize.transaction(async (t) => {
    // A. Create ExpenseReceipt
    const receipt = await ExpenseReceipt.create(
      {
        company_id: companyId,
        trip_id: tripId || (trip ? trip.id : null),
        user_id: user.id,
        file_name: file.filename,
        file_path: file.path,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.mimetype
      },
      { transaction: t }
    );

    // B. Create ExpenseOCR
    const ocrRecord = await ExpenseOCR.create(
      {
        receipt_id: receipt.id,
        company_id: companyId,
        raw_text: parsedOcr.raw_text,
        structured_data: {
          merchant: parsedOcr.merchant,
          amount: parsedOcr.amount,
          subtotal: parsedOcr.subtotal,
          tax: parsedOcr.tax,
          discount: parsedOcr.discount,
          transaction_date: parsedOcr.transaction_date,
          description: parsedOcr.description,
          category: parsedOcr.category,
          items: parsedOcr.items,
          is_blurry: parsedOcr.is_blurry
        },
        confidence: parsedOcr.confidence,
        ai_model: 'hybrid_ocr_ai_v2',
        status: parsedOcr.status
      },
      { transaction: t }
    );

    let draftExpense = null;

    // C. Generate Draft Expense (if tripId is available and autoCreateDraft is true)
    if (autoCreateDraft && tripId) {
      // Find or default category
      let categoryId = null;
      const matchedCategory = await ExpenseCategory.findOne({
        where: { company_id: companyId, code: parsedOcr.category },
        transaction: t
      });
      if (matchedCategory) {
        categoryId = matchedCategory.id;
      }

      // CRITICAL: Status is strictly DRAFT
      draftExpense = await Expense.create(
        {
          company_id: companyId,
          trip_id: tripId,
          officer_id: user.id,
          category_id: categoryId,
          category: parsedOcr.category || 'OTHER',
          amount: parsedOcr.amount || 0,
          date: parsedOcr.transaction_date || new Date(),
          description: parsedOcr.description || `Scan Struk - ${parsedOcr.merchant}`,
          receipt_url: fileUrl,
          input_method: INPUT_METHOD.RECEIPT_SCAN,
          ocr_raw_data: parsedOcr,
          ocr_confidence: parsedOcr.confidence,
          status: EXPENSE_STATUS.DRAFT
        },
        { transaction: t }
      );

      // Link expense_id back to receipt and ocr
      await receipt.update({ expense_id: draftExpense.id }, { transaction: t });
      await ocrRecord.update({ expense_id: draftExpense.id }, { transaction: t });
    }

    return {
      receipt,
      ocr: ocrRecord,
      draft_expense: draftExpense,
      parsed_data: parsedOcr
    };
  });

  logger.info(`Receipt ${file.filename} processed with OCR confidence ${parsedOcr.confidence} for user ${user.id}`);
  return result;
};

/**
 * Retrieve receipt details and OCR analysis
 */
export const getReceiptById = async (companyId, receiptId) => {
  const receipt = await ExpenseReceipt.findOne({
    where: { id: receiptId, company_id: companyId },
    include: [
      { model: ExpenseOCR, as: 'ocr' },
      { model: Expense, as: 'expense' }
    ]
  });

  if (!receipt) {
    const err = new Error('Receipt not found');
    err.statusCode = 404;
    throw err;
  }

  return receipt;
};

/**
 * Retrieve OCR data for a specific receipt
 */
export const getReceiptOcr = async (companyId, receiptId) => {
  const ocr = await ExpenseOCR.findOne({
    where: { receipt_id: receiptId, company_id: companyId }
  });

  if (!ocr) {
    const err = new Error('OCR record not found for receipt');
    err.statusCode = 404;
    throw err;
  }

  return ocr;
};
