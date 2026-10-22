import { Router } from 'express';
import * as expenseController from '../controller/expense.controller.js';
import { validate } from '../validators/validator.wrapper.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  approveRejectExpenseSchema
} from '../validators/expense.validator.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import { uploadReceipt } from '../middleware/upload.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);
router.use(requireActiveSubscription);

// Categories
router.get('/categories', expenseController.getExpenseCategories);

// Pending queue for managers/admins/owners
router.get(
  '/pending',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  expenseController.getPendingExpenses
);

// List & details
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpenseById);

// Create expense & OCR scan
router.post(
  '/',
  uploadReceipt.single('receipt'),
  validate(createExpenseSchema),
  expenseController.createExpense
);

router.post(
  '/scan-receipt',
  uploadReceipt.single('receipt'),
  expenseController.scanReceiptOnly
);

// Receipt & OCR details
router.get('/receipts/:receipt_id', expenseController.getReceiptDetails);
router.get('/receipts/:receipt_id/ocr', expenseController.getReceiptOcr);

// Submit for approval (Officer)
router.post('/:id/submit', expenseController.submitExpense);

// Approval actions (Manager/Admin/Owner)
router.post(
  '/:id/approve',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  expenseController.approveExpense
);

router.put(
  '/:id/approve',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  expenseController.approveExpense
);

router.post(
  '/:id/reject',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  expenseController.rejectExpense
);

router.put(
  '/:id/reject',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  expenseController.rejectExpense
);

router.patch(
  '/:id/approval',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  validate(approveRejectExpenseSchema),
  expenseController.approveOrReject
);

// Edit & Delete
router.put(
  '/:id',
  validate(updateExpenseSchema),
  expenseController.updateExpense
);

router.delete('/:id', expenseController.deleteExpense);

export default router;
