import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { initializeSocket } from '../services/socket.service.js';
import {
  sequelize,
  User,
  Company,
  Trip,
  TripLocation,
  Expense,
  ExpenseApproval,
  WalletTransaction,
  Subscription,
  Payment,
  PaymentWebhookLog
} from '../model/index.js';
import { ROLES, TRIP_STATUS, EXPENSE_STATUS, SUBSCRIPTION_STATUS, PAYMENT_STATUS, COMPANY_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';
import { ENV } from '../config/env.js';

describe('PHASE 10: Security, Testing & Production Hardening Comprehensive Audit', () => {
  let server;
  let serverUrl;
  let request;

  let companyA, ownerA, tokenOwnerA;
  let managerA, tokenManagerA;
  let officerA, tokenOfficerA;

  let companyB, ownerB, tokenOwnerB;
  let managerB, tokenManagerB;
  let officerB, tokenOfficerB;

  let tripA, tripB;
  let expenseA, expenseB;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_GATEWAY = 'SIMULATOR';
    await sequelize.sync({ force: true });
    await seedPlans();

    server = http.createServer(app);
    initializeSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://localhost:${port}`;
        request = supertest(serverUrl);
        resolve();
      });
    });

    // 1. Setup Company A (PT Alpha Security)
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Alpha Owner',
        email: `alpha_owner_${Date.now()}@alpha.com`,
        password: 'Password123!',
        company_name: 'PT Alpha Security'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // Add Manager A
    const addMgrA = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Alpha Manager',
        email: `alpha_mgr_${Date.now()}@alpha.com`,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(201);

    const loginMgrA = await request
      .post('/api/v1/auth/login')
      .send({ email: addMgrA.body.data.email, password: 'Password123!' })
      .expect(200);

    managerA = loginMgrA.body.data.user;
    tokenManagerA = loginMgrA.body.data.tokens.access_token;

    // Add Officer A
    const addOffA = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Alpha Officer',
        email: `alpha_off_${Date.now()}@alpha.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOffA = await request
      .post('/api/v1/auth/login')
      .send({ email: addOffA.body.data.email, password: 'Password123!' })
      .expect(200);

    officerA = loginOffA.body.data.user;
    tokenOfficerA = loginOffA.body.data.tokens.access_token;

    // 2. Setup Company B (PT Beta Isolation)
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Beta Owner',
        email: `beta_owner_${Date.now()}@beta.com`,
        password: 'Password123!',
        company_name: 'PT Beta Isolation'
      })
      .expect(201);

    companyB = regB.body.data.company;
    ownerB = regB.body.data.user;
    tokenOwnerB = regB.body.data.tokens.access_token;

    // Add Manager B
    const addMgrB = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        name: 'Beta Manager',
        email: `beta_mgr_${Date.now()}@beta.com`,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(201);

    const loginMgrB = await request
      .post('/api/v1/auth/login')
      .send({ email: addMgrB.body.data.email, password: 'Password123!' })
      .expect(200);

    managerB = loginMgrB.body.data.user;
    tokenManagerB = loginMgrB.body.data.tokens.access_token;

    // Add Officer B
    const addOffB = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        name: 'Beta Officer',
        email: `beta_off_${Date.now()}@beta.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOffB = await request
      .post('/api/v1/auth/login')
      .send({ email: addOffB.body.data.email, password: 'Password123!' })
      .expect(200);

    officerB = loginOffB.body.data.user;
    tokenOfficerB = loginOffB.body.data.tokens.access_token;

    // 3. Create sample Trip & Expenses for Company A
    const tripARes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Trip Alpha Logistik',
        start_location: 'Jakarta Hub',
        destination: 'Surabaya Hub',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        initial_balance: 1000000,
        officer_id: officerA.id
      })
      .expect(201);

    tripA = tripARes.body.data;

    // Start trip A
    await request
      .put(`/api/v1/trips/${tripA.id}/status`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ status: TRIP_STATUS.ACTIVE })
      .expect(200);

    const expARes = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        trip_id: tripA.id,
        category: 'FUEL',
        amount: 200000,
        description: 'Bensin Alpha KM 100'
      })
      .expect(201);

    expenseA = expARes.body.data;

    // 4. Create sample Trip & Expenses for Company B
    const tripBRes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerB}`)
      .send({
        title: 'Trip Beta Distribusi',
        start_location: 'Bandung Hub',
        destination: 'Semarang Hub',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        initial_balance: 1500000,
        officer_id: officerB.id
      })
      .expect(201);

    tripB = tripBRes.body.data;

    // Start trip B
    await request
      .put(`/api/v1/trips/${tripB.id}/status`)
      .set('Authorization', `Bearer ${tokenManagerB}`)
      .send({ status: TRIP_STATUS.ACTIVE })
      .expect(200);

    const expBRes = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .send({
        trip_id: tripB.id,
        category: 'TOLL',
        amount: 150000,
        description: 'Tol Beta Cipularang'
      })
      .expect(201);

    expenseB = expBRes.body.data;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  });

  // ==========================================
  // 1. AUTHENTICATION & PASSWORD HARDENING
  // ==========================================
  test('1. Authentication: Password hashing uses bcrypt with non-plaintext storage', async () => {
    const user = await User.findByPk(ownerA.id);
    assert.ok(user.password);
    assert.notEqual(user.password, 'Password123!');
    assert.ok(user.password.startsWith('$2')); // bcrypt identifier

    const isMatch = await bcrypt.compare('Password123!', user.password);
    assert.equal(isMatch, true);

    const isWrongMatch = await bcrypt.compare('WrongPassword', user.password);
    assert.equal(isWrongMatch, false);
  });

  test('2. Authentication: Expired token is rejected with HTTP 401', async () => {
    const expiredToken = jwt.sign(
      { userId: ownerA.id, companyId: companyA.id, role: ROLES.OWNER },
      ENV.JWT_SECRET,
      { expiresIn: '-10s' }
    );

    const res = await request
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'TOKEN_INVALID');
  });

  test('3. Authentication: Malformed and tampered token is rejected with HTTP 401', async () => {
    const res = await request
      .get('/api/v1/company')
      .set('Authorization', 'Bearer forged_tampered_token_xyz_123')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'TOKEN_INVALID');
  });

  test('4. Authentication: Missing authorization header is rejected with HTTP 401', async () => {
    const res = await request
      .get('/api/v1/company')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.ok(res.body.error_code === 'UNAUTHORIZED' || res.body.error_code === 'TOKEN_REQUIRED');
  });

  // ==========================================
  // 2. AUTHORIZATION & PRIVILEGE ESCALATION
  // ==========================================
  test('5. Authorization: Officer CANNOT approve expenses (HTTP 403 FORBIDDEN)', async () => {
    const res = await request
      .post(`/api/v1/expenses/${expenseA.id}/approve`)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .expect(403);

    assert.equal(res.body.success, false);
    assert.ok(res.body.error_code === 'FORBIDDEN_APPROVAL' || res.body.error_code === 'ROLE_FORBIDDEN');
  });

  test('6. Authorization: Officer CANNOT create trips (HTTP 403 ROLE_FORBIDDEN)', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        title: 'Officer Escalation Attempt',
        start_location: 'A',
        destination: 'B',
        initial_balance: 100000
      })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'ROLE_FORBIDDEN');
  });

  test('7. Authorization: Manager CANNOT initiate subscription cancellation (HTTP 403)', async () => {
    const res = await request
      .post('/api/v1/subscription/cancel')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ reason: 'Unauthorized cancel attempt' })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'ROLE_FORBIDDEN');
  });

  // ==========================================
  // 3. TENANT ISOLATION (TOP PRIORITY)
  // ==========================================
  test('8. Tenant Isolation: Company A CANNOT read Company B trip details (404/403)', async () => {
    const res = await request
      .get(`/api/v1/trips/${tripB.id}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(404);

    assert.equal(res.body.success, false);
  });

  test('9. Tenant Isolation: Company A CANNOT mutate Company B trip status', async () => {
    const res = await request
      .put(`/api/v1/trips/${tripB.id}/status`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ status: TRIP_STATUS.COMPLETED })
      .expect(404);

    assert.equal(res.body.success, false);
  });

  test('10. Tenant Isolation: Company A CANNOT read Company B expense records', async () => {
    const res = await request
      .get(`/api/v1/expenses/${expenseB.id}`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(404);

    assert.equal(res.body.success, false);
  });

  test('11. Tenant Isolation: Company A CANNOT approve Company B expense', async () => {
    const res = await request
      .post(`/api/v1/expenses/${expenseB.id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(404);

    assert.equal(res.body.success, false);
  });

  test('12. Tenant Isolation: Company A officer CANNOT log GPS to Company B trip', async () => {
    const res = await request
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        trip_id: tripB.id,
        latitude: -6.2088,
        longitude: 106.8456
      })
      .expect(404);

    assert.equal(res.body.success, false);
  });

  test('13. Tenant Isolation: Company A CANNOT read Company B members', async () => {
    const resA = await request
      .get('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    const membersList = Array.isArray(resA.body.data) ? resA.body.data : resA.body.data.members || [];
    const membersAIds = membersList.map((m) => m.user_id || m.id);
    assert.ok(!membersAIds.includes(ownerB.id));
    assert.ok(!membersAIds.includes(managerB.id));
    assert.ok(!membersAIds.includes(officerB.id));
  });

  test('14. Tenant Isolation: Company A CANNOT read Company B wallet transactions', async () => {
    const resA = await request
      .get('/api/v1/wallet/ledger')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    const txsA = Array.isArray(resA.body.data) ? resA.body.data : resA.body.data.transactions || [];
    for (const tx of txsA) {
      assert.equal(tx.company_id, companyA.id);
      assert.notEqual(tx.company_id, companyB.id);
    }
  });

  // ==========================================
  // 4. FINANCIAL INTEGRITY & WALLET ATOMICITY
  // ==========================================
  test('15. Financial Integrity: Pending expense causes NO wallet deduction', async () => {
    const balanceBefore = await Trip.findByPk(tripA.id);
    const initialRemaining = parseFloat(balanceBefore.remaining_budget);

    const pendingTxCount = await WalletTransaction.count({
      where: { company_id: companyA.id, reference_id: `EXP-${expenseA.id.substring(0, 8)}` }
    });
    assert.equal(pendingTxCount, 0, 'Pending expense must generate 0 wallet mutations');

    const balanceAfter = await Trip.findByPk(tripA.id);
    assert.equal(parseFloat(balanceAfter.remaining_budget), initialRemaining);
  });

  test('16. Financial Integrity: Approved expense creates EXACTLY ONE wallet transaction and deducts balance atomically', async () => {
    const balanceBefore = await Trip.findByPk(tripA.id);
    const initialRemaining = parseFloat(balanceBefore.remaining_budget); // 1,000,000

    // Manager approves expense of 200,000
    const approveRes = await request
      .post(`/api/v1/expenses/${expenseA.id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.equal(approveRes.body.data.status, EXPENSE_STATUS.APPROVED);

    // Verify exactly 1 wallet deduction
    const txCount = await WalletTransaction.count({
      where: { company_id: companyA.id, reference_id: `EXP-${expenseA.id.substring(0, 8)}` }
    });
    assert.equal(txCount, 1, 'Approved expense must create exactly one wallet transaction');

    const balanceAfter = await Trip.findByPk(tripA.id);
    assert.equal(parseFloat(balanceAfter.remaining_budget), initialRemaining - 200000); // 800,000
  });

  test('17. Financial Integrity: Double Approval is REJECTED (Idempotent Guard)', async () => {
    const balanceBefore = await Trip.findByPk(tripA.id);
    const remainingBefore = parseFloat(balanceBefore.remaining_budget);

    // Re-approval attempt
    const duplicateApproveRes = await request
      .post(`/api/v1/expenses/${expenseA.id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(400);

    assert.equal(duplicateApproveRes.body.error_code, 'EXPENSE_ALREADY_APPROVED');

    // Wallet balance remained completely untouched
    const balanceAfter = await Trip.findByPk(tripA.id);
    assert.equal(parseFloat(balanceAfter.remaining_budget), remainingBefore);

    const txCount = await WalletTransaction.count({
      where: { company_id: companyA.id, reference_id: `EXP-${expenseA.id.substring(0, 8)}` }
    });
    assert.equal(txCount, 1, 'Duplicate approval attempt must NOT create second wallet transaction');
  });

  test('18. Financial Integrity: Rejected expense causes NO wallet deduction', async () => {
    // Create new expense
    const exp2 = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        trip_id: tripA.id,
        category: 'OTHER',
        amount: 50000,
        description: 'Pengeluaran Ditolak'
      })
      .expect(201);

    const balanceBefore = await Trip.findByPk(tripA.id);
    const remainingBefore = parseFloat(balanceBefore.remaining_budget);

    // Reject expense
    const rejectRes = await request
      .post(`/api/v1/expenses/${exp2.body.data.id}/reject`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ rejection_reason: 'Nota tidak sah / di luar batas' })
      .expect(200);

    assert.equal(rejectRes.body.data.status, EXPENSE_STATUS.REJECTED);

    const balanceAfter = await Trip.findByPk(tripA.id);
    assert.equal(parseFloat(balanceAfter.remaining_budget), remainingBefore);

    const txCount = await WalletTransaction.count({
      where: { company_id: companyA.id, reference_id: `EXP-${exp2.body.data.id.substring(0, 8)}` }
    });
    assert.equal(txCount, 0, 'Rejected expense must generate 0 wallet mutations');
  });

  // ==========================================
  // 5. GPS & INPUT SANITIZATION
  // ==========================================
  test('19. GPS Validation: Coordinates out of valid range (-90..90, -180..180) are rejected', async () => {
    const res = await request
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        trip_id: tripA.id,
        latitude: 95.0, // Invalid > 90
        longitude: 106.8
      })
      .expect(422);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'VALIDATION_ERROR');
  });

  // ==========================================
  // 6. UPLOAD SECURITY & EXTENSIONS
  // ==========================================
  test('20. Upload Security: Malicious / executable file extensions are rejected', async () => {
    const res = await request
      .post('/api/v1/expenses/scan-receipt')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .attach('receipt', Buffer.from('malicious binary content'), 'exploit.exe')
      .expect(400);

    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid file type') || res.body.error_code === 'UPLOAD_ERROR');
  });

  // ==========================================
  // 7. SUBSCRIPTION & READ-ONLY MATRIX
  // ==========================================
  test('21. Subscription Read-Only: Expired company can read but CANNOT write trips/expenses', async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Subscription.update(
      { status: SUBSCRIPTION_STATUS.EXPIRED, trial_ends_at: pastDate, current_period_end: pastDate },
      { where: { company_id: companyB.id } }
    );
    await Company.update(
      { status: COMPANY_STATUS.EXPIRED },
      { where: { id: companyB.id } }
    );

    // Reads permitted
    await request.get('/api/v1/trips').set('Authorization', `Bearer ${tokenOwnerB}`).expect(200);
    await request.get('/api/v1/reports/dashboard').set('Authorization', `Bearer ${tokenOwnerB}`).expect(200);
    await request.get('/api/v1/subscription/status').set('Authorization', `Bearer ${tokenOwnerB}`).expect(200);

    // Mutations blocked with 403
    const tripRes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerB}`)
      .send({ title: 'Trip Expired', start_location: 'A', destination: 'B' })
      .expect(403);
    assert.ok(tripRes.body.error_code === 'SUBSCRIPTION_EXPIRED' || tripRes.body.error_code === 'COMPANY_SUBSCRIPTION_EXPIRED');

    const expRes = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerB}`)
      .send({ trip_id: tripB.id, category: 'FUEL', amount: 100000 })
      .expect(403);
    assert.ok(expRes.body.error_code === 'SUBSCRIPTION_EXPIRED' || expRes.body.error_code === 'COMPANY_SUBSCRIPTION_EXPIRED');

    // Checkout renewal permitted
    const checkoutRes = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ payment_method: 'QRIS', gateway: 'SIMULATOR' })
      .expect(201);
    assert.ok(checkoutRes.body.data.checkout_info.invoice_number);
  });
});
