import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../app.js';
import { sequelize, User, Company, Trip, Expense, ExpenseCategory, ExpenseApproval, WalletTransaction } from '../model/index.js';
import { ROLES, TRIP_STATUS, EXPENSE_STATUS, INPUT_METHOD, TRANSACTION_TYPES } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

const request = supertest(app);

describe('PHASE 5: Expense, Approval & Wallet Ledger Comprehensive Test Suite', () => {
  let companyA, ownerA, tokenOwnerA;
  let managerA, tokenManagerA;
  let officerA1, tokenOfficerA1;
  let officerA2, tokenOfficerA2;
  let companyB, tokenOwnerB;

  let activeTripId;
  const initialBudget = 2000000; // Rp 2.000.000
  let draftExpenseId;
  let pendingExpense1Id;
  let pendingExpense2Id;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();

    // 1. Register Company A
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Budi Owner',
        email: `owner_${Date.now()}@expensecorp.com`,
        password: 'Password123!',
        company_name: 'PT Nusantara Expense Jaya'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // 2. Register Company B for Tenant Isolation tests
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Joko Owner B',
        email: `owner_${Date.now()}@othercorp.com`,
        password: 'Password123!',
        company_name: 'PT Multi Tenant Luar'
      })
      .expect(201);

    companyB = regB.body.data.company;
    tokenOwnerB = regB.body.data.tokens.access_token;

    // 3. Add Manager to Company A
    const addManagerRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Ibu Maya Manager',
        email: `maya_${Date.now()}@expensecorp.com`,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(201);

    const loginMgr = await request
      .post('/api/v1/auth/login')
      .send({ email: addManagerRes.body.data.email, password: 'Password123!' })
      .expect(200);

    managerA = loginMgr.body.data.user;
    tokenManagerA = loginMgr.body.data.tokens.access_token;

    // 4. Add Officer 1 to Company A
    const addOfficer1Res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Doni Officer',
        email: `doni_${Date.now()}@expensecorp.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOff1 = await request
      .post('/api/v1/auth/login')
      .send({ email: addOfficer1Res.body.data.email, password: 'Password123!' })
      .expect(200);

    officerA1 = loginOff1.body.data.user;
    tokenOfficerA1 = loginOff1.body.data.tokens.access_token;

    // 5. Add Officer 2 to Company A
    const addOfficer2Res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Rian Officer 2',
        email: `rian_${Date.now()}@expensecorp.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOff2 = await request
      .post('/api/v1/auth/login')
      .send({ email: addOfficer2Res.body.data.email, password: 'Password123!' })
      .expect(200);

    officerA2 = loginOff2.body.data.user;
    tokenOfficerA2 = loginOff2.body.data.tokens.access_token;

    // 6. Create and Start a Trip with Rp 2.000.000 Initial Budget assigned to Officer 1
    const createTripRes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Perjalanan Dinas Audit Surabaya',
        description: 'Audit cabang dan survei logistik Surabaya',
        start_location: 'Kantor Pusat Jakarta',
        destination: 'Gudang Rungkut Surabaya',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        initial_balance: initialBudget,
        status: TRIP_STATUS.SCHEDULED,
        officer_ids: [officerA1.id]
      })
      .expect(201);

    activeTripId = createTripRes.body.data.id;

    // Start trip
    await request
      .patch(`/api/v1/trips/${activeTripId}/status`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({ status: TRIP_STATUS.ACTIVE })
      .expect(200);
  });

  after(async () => {
    await sequelize.close();
  });

  // ==========================================
  // 1. EXPENSE CATEGORIES
  // ==========================================
  test('1. GET /api/v1/expenses/categories - Returns seeded default categories', async () => {
    const res = await request
      .get('/api/v1/expenses/categories')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 7, 'Should have at least 7 default categories');
    
    const codes = res.body.data.map(c => c.code);
    assert.ok(codes.includes('FUEL'));
    assert.ok(codes.includes('MEALS'));
    assert.ok(codes.includes('TOLL'));
    assert.ok(codes.includes('ACCOMMODATION'));
  });

  // ==========================================
  // 2. CREATE EXPENSE (MANUAL & DRAFT)
  // ==========================================
  test('2. POST /api/v1/expenses - Officer creates DRAFT expense with MANUAL method (No wallet deduction)', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: activeTripId,
        category: 'FUEL',
        amount: 150000,
        input_method: INPUT_METHOD.MANUAL,
        status: EXPENSE_STATUS.DRAFT,
        description: 'Bensin Pertamax tol Cikampek',
        date: new Date().toISOString()
      })
      .expect(201);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, EXPENSE_STATUS.DRAFT);
    assert.strictEqual(res.body.data.input_method, INPUT_METHOD.MANUAL);
    assert.strictEqual(parseFloat(res.body.data.amount), 150000);
    draftExpenseId = res.body.data.id;

    // Verify trip balance is NOT deducted
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), initialBudget);
  });

  // ==========================================
  // 3. SUBMIT DRAFT EXPENSE
  // ==========================================
  test('3. POST /api/v1/expenses/:id/submit - Officer submits DRAFT expense to PENDING status', async () => {
    const res = await request
      .post(`/api/v1/expenses/${draftExpenseId}/submit`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, EXPENSE_STATUS.PENDING);
    pendingExpense1Id = draftExpenseId;

    // Verify trip balance is still NOT deducted
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), initialBudget);
  });

  // ==========================================
  // 4. CREATE EXPENSE (RECEIPT_SCAN & DIRECT PENDING)
  // ==========================================
  test('4. POST /api/v1/expenses - Officer creates second expense with RECEIPT_SCAN directly to PENDING', async () => {
    const res = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: activeTripId,
        category: 'MEALS',
        amount: 250000,
        input_method: INPUT_METHOD.RECEIPT_SCAN,
        status: EXPENSE_STATUS.PENDING,
        description: 'Makan siang tim audit Rest Area KM 57',
        ocr_confidence: 0.95
      })
      .expect(201);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, EXPENSE_STATUS.PENDING);
    assert.strictEqual(res.body.data.input_method, INPUT_METHOD.RECEIPT_SCAN);
    assert.strictEqual(parseFloat(res.body.data.amount), 250000);
    pendingExpense2Id = res.body.data.id;

    // Balance still intact
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), initialBudget);
  });

  // ==========================================
  // 5. PENDING EXPENSE QUEUE & TENANT ISOLATION
  // ==========================================
  test('5. GET /api/v1/expenses/pending - Manager sees queue; Company B sees nothing', async () => {
    const resMgr = await request
      .get('/api/v1/expenses/pending')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(resMgr.body.success, true);
    assert.strictEqual(resMgr.body.data.length, 2);

    // Tenant Isolation: Company B queries pending expenses
    const resB = await request
      .get('/api/v1/expenses/pending')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(200);

    assert.strictEqual(resB.body.success, true);
    assert.strictEqual(resB.body.data.length, 0);
  });

  // ==========================================
  // 6. RBAC RESTRICTION: OFFICER CANNOT APPROVE / REJECT
  // ==========================================
  test('6. RBAC Guard - Officer is forbidden from approving or rejecting expenses', async () => {
    // Attempt approval by Officer
    const resApprove = await request
      .post(`/api/v1/expenses/${pendingExpense1Id}/approve`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send();

    assert.strictEqual(resApprove.status, 403);

    // Attempt rejection by Officer
    const resReject = await request
      .post(`/api/v1/expenses/${pendingExpense1Id}/reject`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({ rejection_reason: 'I changed my mind' });

    assert.strictEqual(resReject.status, 403);
  });

  // ==========================================
  // 7. MANAGER APPROVES EXPENSE & WALLET DEDUCTION
  // ==========================================
  test('7. POST /api/v1/expenses/:id/approve - Manager approves expense, wallet is deducted via wallet.service', async () => {
    const expenseAmount = 150000;
    const expectedRemaining = initialBudget - expenseAmount;

    const res = await request
      .post(`/api/v1/expenses/${pendingExpense1Id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, EXPENSE_STATUS.APPROVED);
    assert.strictEqual(res.body.data.approved_by, managerA.id);

    // Verify Trip balance
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), expectedRemaining);

    // Verify ExpenseApproval audit table
    const approvalAudit = await ExpenseApproval.findOne({
      where: { expense_id: pendingExpense1Id }
    });
    assert.ok(approvalAudit);
    assert.strictEqual(approvalAudit.approver_id, managerA.id);
    assert.strictEqual(approvalAudit.action, 'APPROVED');

    // Verify WalletTransaction ledger mutation
    const walletTx = await WalletTransaction.findOne({
      where: {
        company_id: companyA.id,
        trip_id: activeTripId,
        type: TRANSACTION_TYPES.EXPENSE
      }
    });
    assert.ok(walletTx);
    assert.strictEqual(parseFloat(walletTx.amount), expenseAmount);
    assert.strictEqual(parseFloat(walletTx.balance_before), initialBudget);
    assert.strictEqual(parseFloat(walletTx.balance_after), expectedRemaining);
  });

  // ==========================================
  // 8. IDEMPOTENCY & DUPLICATE APPROVAL GUARD
  // ==========================================
  test('8. Duplicate Approval Guard - Approved expense cannot be re-approved or rejected', async () => {
    // Attempt re-approval
    const resReApprove = await request
      .post(`/api/v1/expenses/${pendingExpense1Id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(400);

    assert.strictEqual(resReApprove.body.success, false);

    // Attempt rejection of approved expense
    const resRejectApproved = await request
      .post(`/api/v1/expenses/${pendingExpense1Id}/reject`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ rejection_reason: 'Late rejection' })
      .expect(400);

    assert.strictEqual(resRejectApproved.body.success, false);

    // Ensure wallet was not deducted twice
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), initialBudget - 150000);
  });

  // ==========================================
  // 9. REJECTION FLOW WITH REASON
  // ==========================================
  test('9. POST /api/v1/expenses/:id/reject - Rejection requires reason, no wallet deduction occurs', async () => {
    // 9a. Rejection without reason fails
    const resNoReason = await request
      .post(`/api/v1/expenses/${pendingExpense2Id}/reject`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ rejection_reason: '' })
      .expect(400);

    assert.strictEqual(resNoReason.body.success, false);

    // 9b. Rejection with valid reason succeeds
    const rejectionReason = 'Struk buram dan tidak terbaca nominalnya. Harap upload ulang.';
    const res = await request
      .post(`/api/v1/expenses/${pendingExpense2Id}/reject`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ rejection_reason: rejectionReason })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, EXPENSE_STATUS.REJECTED);
    assert.strictEqual(res.body.data.rejection_reason, rejectionReason);

    // Verify NO wallet deduction occurred
    const trip = await Trip.findByPk(activeTripId);
    assert.strictEqual(parseFloat(trip.remaining_budget), initialBudget - 150000);

    // Verify ExpenseApproval record
    const rejectAudit = await ExpenseApproval.findOne({
      where: { expense_id: pendingExpense2Id, action: 'REJECTED' }
    });
    assert.ok(rejectAudit);
    assert.strictEqual(rejectAudit.rejection_reason, rejectionReason);
  });

  // ==========================================
  // 10. WALLET BALANCE & LEDGER ENDPOINTS
  // ==========================================
  test('10. GET /api/v1/wallets/balance/:tripId & /ledger - Returns accurate financial ledger', async () => {
    // 10a. Trip Balance Summary
    const balRes = await request
      .get(`/api/v1/wallets/balance/${activeTripId}`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.strictEqual(balRes.body.success, true);
    assert.strictEqual(balRes.body.data.initial_balance, initialBudget);
    assert.strictEqual(balRes.body.data.remaining_budget, initialBudget - 150000);
    assert.strictEqual(balRes.body.data.total_spent, 150000);

    // 10b. Officer Ledger
    const offLedgerRes = await request
      .get('/api/v1/wallets/ledger')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.strictEqual(offLedgerRes.body.success, true);
    assert.ok(offLedgerRes.body.data.length >= 2, 'Should contain INITIAL and EXPENSE transactions');

    // 10c. Manager Ledger (Company-wide)
    const mgrLedgerRes = await request
      .get('/api/v1/wallets/ledger')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(mgrLedgerRes.body.success, true);
    assert.ok(mgrLedgerRes.body.data.length >= 2);

    // 10d. Tenant Isolation: Company B queries Company A trip balance -> 404
    const resB = await request
      .get(`/api/v1/wallets/balance/${activeTripId}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(404);

    assert.strictEqual(resB.body.success, false);
  });
});
