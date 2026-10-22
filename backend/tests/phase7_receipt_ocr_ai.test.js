import test, { describe, before, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { Company, User, Trip, Expense, ExpenseReceipt, ExpenseOCR, WalletTransaction } from '../model/index.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';
import { EXPENSE_STATUS, INPUT_METHOD } from '../config/constants.js';

describe('PHASE 7: Receipt OCR + AI Comprehensive Integration Test Suite', () => {
  let companyId;
  let ownerToken;
  let managerToken;
  let officerToken;
  let officerId;
  let tripId;
  let testReceiptPath;
  let blurryReceiptPath;
  let createdReceiptId;
  let draftExpenseId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    testReceiptPath = path.join(fixturesDir, 'sample-fuel-receipt.png');
    blurryReceiptPath = path.join(fixturesDir, 'sample-blurry-receipt.png');

    fs.writeFileSync(testReceiptPath, Buffer.from('FAKE_PNG_BINARY_DATA_RECEIPT_PERTAMAX_150000'));
    fs.writeFileSync(blurryReceiptPath, Buffer.from('FAKE_PNG_BINARY_DATA_BLURRY_UNREADABLE'));

    await sequelize.sync({ force: true });
    await seedPlans();

    // 1. Register Company & Owner
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Lintas Trans Logistik',
        name: 'Pak Rahmat Owner',
        email: 'rahmat@lintastrans.com',
        password: 'Password123!',
        phone: '081234567890'
      });

    assert.equal(regRes.status, 201);
    ownerToken = regRes.body.data.token;
    companyId = regRes.body.data.company.id;

    // 2. Add Manager
    const mgrRes = await request(app)
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Ibu Ratna Manager',
        email: 'ratna@lintastrans.com',
        password: 'Password123!',
        role: 'MANAGER',
        phone: '081234567891'
      });
    assert.equal(mgrRes.status, 201);

    // 3. Add Officer
    const offRes = await request(app)
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Doni Driver Officer',
        email: 'doni@lintastrans.com',
        password: 'Password123!',
        role: 'OFFICER',
        phone: '081234567892'
      });
    assert.equal(offRes.status, 201);
    officerId = offRes.body.data.user_id;

    // Login Manager & Officer to get tokens
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ratna@lintastrans.com', password: 'Password123!' });
    assert.equal(mgrLogin.status, 200);
    managerToken = mgrLogin.body.data.token;

    const offLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doni@lintastrans.com', password: 'Password123!' });
    assert.equal(offLogin.status, 200);
    officerToken = offLogin.body.data.token;

    // 4. Manager creates a Trip with Rp 2.000.000 budget and assigns Officer
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Ekspedisi Logistik Surabaya',
        start_location: 'Jakarta HQ',
        destination: 'Surabaya Warehouse',
        start_at: new Date(Date.now() + 86400000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        initial_balance: 2000000,
        officer_id: officerId
      });
    assert.equal(tripRes.status, 201);
    tripId = tripRes.body.data.id;

    // Start trip so it is ACTIVE
    await request(app)
      .post(`/api/v1/trips/${tripId}/start`)
      .set('Authorization', `Bearer ${officerToken}`);
  });

  it('1. Camera/Upload Receipt -> OCR -> AI Parsing -> Generates DRAFT Expense', async () => {
    const res = await request(app)
      .post('/api/v1/expenses/scan-receipt')
      .set('Authorization', `Bearer ${officerToken}`)
      .field('trip_id', tripId)
      .attach('receipt', testReceiptPath);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.receipt, 'Receipt object must be returned');
    assert.ok(data.ocr, 'OCR record object must be returned');
    assert.ok(data.draft_expense, 'Draft expense object must be returned');
    assert.ok(data.parsed_data, 'Parsed AI data must be returned');

    createdReceiptId = data.receipt.id;
    draftExpenseId = data.draft_expense.id;

    // Verify AI Parsed structure
    const parsed = data.parsed_data;
    assert.equal(parsed.category, 'FUEL');
    assert.equal(parsed.amount, 150000);
    assert.ok(parsed.merchant.includes('PERTAMINA'), 'Merchant should identify Pertamina');
    assert.ok(parsed.confidence >= 0.8, 'Confidence should be high for valid receipt');

    // CRITICAL: Draft status verification
    assert.equal(data.draft_expense.status, EXPENSE_STATUS.DRAFT);
    assert.equal(data.draft_expense.input_method, INPUT_METHOD.RECEIPT_SCAN);
    assert.equal(data.draft_expense.amount, 150000);
  });

  it('2. Strict Business Rule: AI Output does NOT approve expense or deduct wallet balance', async () => {
    // 1. Check Trip Balance
    const balanceRes = await request(app)
      .get(`/api/v1/wallet/balance/${tripId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(balanceRes.status, 200);
    // Initial balance Rp 2.000.000 must remain untouched
    assert.equal(parseFloat(balanceRes.body.data.remaining_budget), 2000000);
    assert.equal(parseFloat(balanceRes.body.data.total_spent), 0);

    // 2. Check Expense in DB
    const expenseDb = await Expense.findByPk(draftExpenseId);
    assert.equal(expenseDb.status, EXPENSE_STATUS.DRAFT);
    assert.equal(expenseDb.approved_by, null);
    assert.equal(expenseDb.approved_at, null);

    // 3. Check Wallet Transactions count
    const txCount = await WalletTransaction.count({
      where: { trip_id: tripId, type: 'EXPENSE' }
    });
    assert.equal(txCount, 0, 'No expense transaction ledger should be written on scan');
  });

  it('3. Blurry Receipt Handling: Graceful fallback with low confidence and partial flag', async () => {
    const res = await request(app)
      .post('/api/v1/expenses/scan-receipt')
      .set('Authorization', `Bearer ${officerToken}`)
      .field('trip_id', tripId)
      .attach('receipt', blurryReceiptPath);

    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.ok(data.parsed_data.confidence < 0.6, 'Confidence should be low for blurry receipt');
    assert.equal(data.parsed_data.is_blurry, true);
    assert.equal(data.draft_expense.status, EXPENSE_STATUS.DRAFT);
  });

  it('4. Officer Reviews and Edits Draft Expense fields', async () => {
    const editRes = await request(app)
      .put(`/api/v1/expenses/${draftExpenseId}`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        amount: 155000, // Corrected by user
        category: 'FUEL',
        description: 'BBM Pertamax Rest Area KM 57 (Koreksi Pengemudi)'
      });

    assert.equal(editRes.status, 200);
    assert.equal(parseFloat(editRes.body.data.amount), 155000);
    assert.equal(editRes.body.data.description, 'BBM Pertamax Rest Area KM 57 (Koreksi Pengemudi)');
    assert.equal(editRes.body.data.status, EXPENSE_STATUS.DRAFT);
  });

  it('5. Officer Confirms and Submits Draft Expense to PENDING', async () => {
    const submitRes = await request(app)
      .post(`/api/v1/expenses/${draftExpenseId}/submit`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.status, EXPENSE_STATUS.PENDING);

    // Verify still not deducted
    const balanceRes = await request(app)
      .get(`/api/v1/wallet/balance/${tripId}`)
      .set('Authorization', `Bearer ${officerToken}`);
    assert.equal(parseFloat(balanceRes.body.data.remaining_budget), 2000000);
  });

  it('6. Manager Reviews and Approves Submitted Expense -> Wallet is Deducted', async () => {
    const approveRes = await request(app)
      .post(`/api/v1/expenses/${draftExpenseId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`);

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, EXPENSE_STATUS.APPROVED);

    // Verify wallet deduction
    const balanceRes = await request(app)
      .get(`/api/v1/wallet/balance/${tripId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(parseFloat(balanceRes.body.data.remaining_budget), 1845000); // 2.000.000 - 155.000
    assert.equal(parseFloat(balanceRes.body.data.total_spent), 155000);
  });

  it('7. Fetch Receipt & OCR Details via API', async () => {
    const receiptRes = await request(app)
      .get(`/api/v1/expenses/receipts/${createdReceiptId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.equal(receiptRes.status, 200);
    assert.equal(receiptRes.body.data.id, createdReceiptId);
    assert.ok(receiptRes.body.data.ocr);
    assert.equal(receiptRes.body.data.ocr.status, 'SUCCESS');

    const ocrRes = await request(app)
      .get(`/api/v1/expenses/receipts/${createdReceiptId}/ocr`)
      .set('Authorization', `Bearer ${managerToken}`);

    assert.equal(ocrRes.status, 200);
    assert.ok(ocrRes.body.data.raw_text.includes('PERTAMINA'));
    assert.equal(ocrRes.body.data.structured_data.category, 'FUEL');
  });

  it('8. Tenant Isolation: Company B cannot access Company A receipt or OCR', async () => {
    // Register Company B
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Kompetitor Perkasa',
        name: 'Joko Owner B',
        email: 'joko@kompetitor.com',
        password: 'Password123!',
        phone: '081299998888'
      });
    const tokenB = regB.body.data.token;

    const crossReceiptRes = await request(app)
      .get(`/api/v1/expenses/receipts/${createdReceiptId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(crossReceiptRes.status, 404);

    const crossOcrRes = await request(app)
      .get(`/api/v1/expenses/receipts/${createdReceiptId}/ocr`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(crossOcrRes.status, 404);
  });
});
