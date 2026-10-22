import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../app.js';
import { sequelize, Company, Subscription } from '../model/index.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('SAKULAJAN SaaS - Subscription, Webhook & Read-Only Policy Tests', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();
  });

  after(async () => {
    await sequelize.close();
  });

  let ownerToken = '';
  let companyId = '';
  let invoiceNumber = '';

  it('Setup: Register Company', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Digital Solusi Sentosa',
        company_email: 'finance@sentosa.com',
        owner_name: 'Andi Setiawan',
        owner_email: 'andi@sentosa.com',
        owner_password: 'password123'
      });

    ownerToken = res.body.data.tokens.access_token;
    companyId = res.body.data.company.id;
  });

  it('1. Check initial subscription status (Trial Active)', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/status')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.company.status, 'TRIAL');
  });

  it('2. Simulate trial expiration and verify Read-Only Mode enforcement', async () => {
    // Manually set trial_ends_at in Subscription to the past
    const pastDate = new Date(Date.now() - 86400000);
    await Subscription.update(
      { trial_ends_at: pastDate, status: 'EXPIRED' },
      { where: { company_id: companyId } }
    );
    await Company.update(
      { status: 'EXPIRED' },
      { where: { id: companyId } }
    );

    // A) GET requests are still permitted (Read-Only access guaranteed)
    const getRes = await request(app)
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.headers['x-subscription-status'], 'EXPIRED');

    // B) POST/mutation requests are blocked (403 SUBSCRIPTION_EXPIRED)
    const postRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Trip Blocked by Read Only',
        origin: 'Jakarta',
        destination: 'Bogor',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        allocated_budget: 100000
      });

    assert.strictEqual(postRes.status, 403);
    assert.strictEqual(postRes.body.error_code, 'SUBSCRIPTION_EXPIRED');
  });

  it('3. Owner initiates Subscription Checkout (Rp50.000 / month)', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ payment_method: 'QRIS' });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(parseFloat(res.body.data.payment.amount), 50000);
    assert.strictEqual(res.body.data.payment.status, 'PENDING');
    invoiceNumber = res.body.data.checkout_info.invoice_number;
  });

  it('4. Payment Webhook processes payment and transitions Company from EXPIRED to ACTIVE', async () => {
    const webhookRes = await request(app)
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: invoiceNumber,
        transaction_id: 'TRX-MIDTRANS-998877',
        payment_status: 'PAID',
        paid_at: new Date().toISOString(),
        payment_method: 'QRIS'
      });

    assert.strictEqual(webhookRes.status, 200);
    assert.strictEqual(webhookRes.body.success, true);

    // Verify Company is now ACTIVE
    const statusRes = await request(app)
      .get('/api/v1/subscriptions/status')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.company.status, 'ACTIVE');
  });

  it('5. Verify full write access is restored after subscription activation', async () => {
    const postRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Trip Unlocked After Payment',
        origin: 'Jakarta',
        destination: 'Bogor',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        allocated_budget: 500000
      });

    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.body.data.title, 'Trip Unlocked After Payment');
  });
});
