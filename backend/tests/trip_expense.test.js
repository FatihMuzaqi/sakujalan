import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('SAKULAJAN SaaS - Trip Lifecycle, Expense Approval & Budget Deduction Tests', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();
  });

  after(async () => {
    await sequelize.close();
  });

  let ownerToken = '';
  let managerToken = '';
  let officerToken = '';
  let officerId = '';
  let tripId = '';
  let expenseId = '';

  it('Setup: Register Company and create Manager & Officer', async () => {
    // 1. Register Owner
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Ekspedisi Amanah',
        company_email: 'ops@amanah.co.id',
        owner_name: 'Haji Ahmad',
        owner_email: 'ahmad@amanah.co.id',
        owner_password: 'password123'
      });
    ownerToken = regRes.body.data.tokens.access_token;

    // 2. Create Manager
    const mgrRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Siti Manager',
        email: 'siti@amanah.co.id',
        password: 'password123',
        role: 'MANAGER'
      });
    assert.strictEqual(mgrRes.status, 201);

    // 3. Create Officer
    const offRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Bayu Driver',
        email: 'bayu@amanah.co.id',
        password: 'password123',
        role: 'OFFICER'
      });
    assert.strictEqual(offRes.status, 201);
    officerId = offRes.body.data.id;

    // Logins
    const mgrLogin = await request(app).post('/api/v1/auth/login').send({ email: 'siti@amanah.co.id', password: 'password123' });
    managerToken = mgrLogin.body.data.tokens.access_token;

    const offLogin = await request(app).post('/api/v1/auth/login').send({ email: 'bayu@amanah.co.id', password: 'password123' });
    officerToken = offLogin.body.data.tokens.access_token;
  });

  it('1. Manager creates a Trip with Rp2.000.000 budget and assigns Officer', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Pengiriman Kargo Surabaya',
        purpose: 'Pengantaran suku cadang mesin ke pelabuhan Tanjung Perak',
        origin: 'Jakarta',
        destination: 'Surabaya',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        allocated_budget: 2000000,
        officer_id: officerId
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.status === 'ASSIGNED' || res.body.data.status === 'SCHEDULED');
    assert.strictEqual(parseFloat(res.body.data.allocated_budget), 2000000);
    assert.strictEqual(parseFloat(res.body.data.remaining_budget), 2000000);
    tripId = res.body.data.id;
  });

  it('2. Officer starts the trip (status changes to IN_PROGRESS)', async () => {
    const res = await request(app)
      .patch(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'ACTIVE' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.status === 'IN_PROGRESS' || res.body.data.status === 'ACTIVE');
  });

  it('3. Officer submits an expense of Rp250.000 for FUEL', async () => {
    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        trip_id: tripId,
        category: 'FUEL',
        amount: 250000,
        date: new Date().toISOString(),
        description: 'Bensin Pertamax Tol Cipali'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.status === 'SUBMITTED' || res.body.data.status === 'PENDING');
    assert.strictEqual(parseFloat(res.body.data.amount), 250000);
    expenseId = res.body.data.id;
  });

  it('4. Officer cannot approve their own expense (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/expenses/${expenseId}/approval`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ action: 'APPROVE' });

    assert.strictEqual(res.status, 403);
  });

  it('5. Manager approves expense, deducting remaining trip budget to Rp1.750.000', async () => {
    const res = await request(app)
      .patch(`/api/v1/expenses/${expenseId}/approval`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: 'APPROVE' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'APPROVED');

    // Verify trip remaining budget
    const tripRes = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    assert.strictEqual(parseFloat(tripRes.body.data.remaining_budget), 1750000);
  });

  it('6. Ledger reflects the budget allocation and approved expense deduction', async () => {
    const res = await request(app)
      .get('/api/v1/wallet/ledger')
      .set('Authorization', `Bearer ${managerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 2);
    assert.ok(res.body.data[0].type === 'EXPENSE_DEDUCTION' || res.body.data[0].type === 'EXPENSE');
  });
});
