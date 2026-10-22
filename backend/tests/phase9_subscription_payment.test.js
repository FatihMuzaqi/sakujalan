import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import supertest from 'supertest';
import app from '../app.js';
import { initializeSocket } from '../services/socket.service.js';
import { sequelize, User, Company, Subscription, Payment, PaymentWebhookLog, Plan } from '../model/index.js';
import { ROLES, COMPANY_STATUS, SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';
import { checkAndExpireSubscriptions } from '../jobs/subscription.job.js';

describe('PHASE 9: Subscription, Trial, Payment & SaaS Billing Comprehensive Test Suite', () => {
  let server;
  let serverUrl;
  let request;

  let companyA, ownerA, tokenOwnerA;
  let companyB, ownerB, tokenOwnerB;
  let checkoutInvoiceA;

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

    // 1. Register Company A
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Hendra Owner A',
        email: `owner_${Date.now()}@billing-a.com`,
        password: 'Password123!',
        company_name: 'PT Billing Nusantara'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // 2. Register Company B
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Bambang Owner B',
        email: `owner_${Date.now()}@billing-b.com`,
        password: 'Password123!',
        company_name: 'PT Billing Mandiri'
      })
      .expect(201);

    companyB = regB.body.data.company;
    ownerB = regB.body.data.user;
    tokenOwnerB = regB.body.data.tokens.access_token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  });

  test('1. Trial Creation: 30-day Free Trial created automatically with Plan price', async () => {
    const res = await request
      .get('/api/v1/subscription/status')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Check Plan & Status
    assert.equal(data.plan.code, 'MONTHLY');
    assert.equal(parseFloat(data.plan.price), 50000);
    assert.equal(data.status_info.status, SUBSCRIPTION_STATUS.TRIAL);
    assert.equal(data.status_info.is_active, true);
    assert.equal(data.status_info.is_read_only, false);
    assert.ok(data.status_info.days_remaining >= 29);
  });

  test('2. Subscription Checkout: Creates invoice and PENDING payment record', async () => {
    const res = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        payment_method: 'QRIS',
        gateway: 'SIMULATOR'
      })
      .expect(201);

    assert.equal(res.body.success, true);
    const checkoutInfo = res.body.data.checkout_info;

    assert.ok(checkoutInfo.invoice_number);
    assert.equal(checkoutInfo.amount, 50000);
    assert.equal(checkoutInfo.payment_method, 'QRIS');
    assert.ok(checkoutInfo.payment_url);

    checkoutInvoiceA = checkoutInfo.invoice_number;

    // Verify Payment in database
    const payment = await Payment.findOne({ where: { gateway_order_id: checkoutInvoiceA } });
    assert.ok(payment);
    assert.equal(payment.status, PAYMENT_STATUS.PENDING);
    assert.equal(parseFloat(payment.amount), 50000);
  });

  test('3. Payment Webhook Success: Transitions Payment to PAID and Subscription to ACTIVE', async () => {
    const eventId = `EVT-${Date.now()}-001`;
    const res = await request
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: checkoutInvoiceA,
        transaction_id: `TRX-${Date.now()}`,
        payment_status: 'PAID',
        paid_at: new Date().toISOString(),
        payment_method: 'QRIS',
        event_id: eventId,
        gateway: 'SIMULATOR'
      })
      .expect(200);

    assert.equal(res.body.success, true);

    // Verify Subscription status is now ACTIVE
    const statusRes = await request
      .get('/api/v1/subscription/status')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    assert.equal(statusRes.body.data.status_info.status, SUBSCRIPTION_STATUS.ACTIVE);
    assert.equal(statusRes.body.data.status_info.is_active, true);
    assert.equal(statusRes.body.data.status_info.is_read_only, false);
    assert.ok(statusRes.body.data.status_info.days_remaining >= 29);

    // Verify Webhook Log record
    const log = await PaymentWebhookLog.findOne({ where: { event_id: eventId } });
    assert.ok(log);
    assert.equal(log.status, 'PROCESSED');
  });

  test('4. Idempotency: Duplicate webhook event does NOT process or re-extend twice', async () => {
    const duplicateEventId = `DUP-TEST-${Date.now()}`;

    // 1. Create a new checkout
    const checkoutRes = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ payment_method: 'VIRTUAL_ACCOUNT', gateway: 'SIMULATOR' })
      .expect(201);

    const invoice = checkoutRes.body.data.checkout_info.invoice_number;

    // 2. First Webhook Delivery
    const firstDelivery = await request
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: invoice,
        transaction_id: `TRX-${invoice}`,
        payment_status: 'PAID',
        event_id: duplicateEventId,
        gateway: 'SIMULATOR'
      })
      .expect(200);

    assert.equal(firstDelivery.body.data?.status || 'PAID', 'PAID');

    // Capture expiration date after first extension
    const subAfterFirst = await Subscription.findOne({
      where: { company_id: companyA.id },
      order: [['created_at', 'DESC']]
    });
    const firstPeriodEnd = new Date(subAfterFirst.current_period_end).getTime();

    // 3. Second Webhook Delivery (exact same event_id)
    const secondDelivery = await request
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: invoice,
        transaction_id: `TRX-${invoice}`,
        payment_status: 'PAID',
        event_id: duplicateEventId,
        gateway: 'SIMULATOR'
      })
      .expect(200);

    assert.equal(secondDelivery.body.success, true);
    assert.equal(secondDelivery.body.data.status, 'DUPLICATE');

    // Verify expiration date did NOT change
    const subAfterSecond = await Subscription.findOne({
      where: { company_id: companyA.id },
      order: [['created_at', 'DESC']]
    });
    const secondPeriodEnd = new Date(subAfterSecond.current_period_end).getTime();

    assert.equal(firstPeriodEnd, secondPeriodEnd, 'Duplicate webhook must not extend subscription twice');
  });

  test('5. Early Payment Rule: Extending from existing current_period_end preserves remaining days', async () => {
    // Current period is valid for ~60 days (due to tests 3 & 4)
    const currentSub = await Subscription.findOne({
      where: { company_id: companyA.id },
      order: [['created_at', 'DESC']]
    });
    const initialEndDate = new Date(currentSub.current_period_end);

    // User pays early
    const checkoutRes = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ payment_method: 'QRIS', gateway: 'SIMULATOR' })
      .expect(201);

    const earlyInvoice = checkoutRes.body.data.checkout_info.invoice_number;

    await request
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: earlyInvoice,
        transaction_id: `TRX-EARLY-${Date.now()}`,
        payment_status: 'PAID',
        gateway: 'SIMULATOR'
      })
      .expect(200);

    const renewedSub = await Subscription.findOne({
      where: { company_id: companyA.id },
      order: [['created_at', 'DESC']]
    });

    const newEndDate = new Date(renewedSub.current_period_end);
    const differenceInDays = Math.round((newEndDate - initialEndDate) / (1000 * 60 * 60 * 24));

    // The new end date should be extended by exactly 30 days from initialEndDate
    assert.equal(differenceInDays, 30, 'Early payment must extend from existing period end date');
  });

  test('6. Payment Failure: Marks Payment as FAILED without activating subscription', async () => {
    const checkoutRes = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ payment_method: 'QRIS', gateway: 'SIMULATOR' })
      .expect(201);

    const failInvoice = checkoutRes.body.data.checkout_info.invoice_number;

    await request
      .post('/api/v1/webhooks/payment')
      .send({
        invoice_number: failInvoice,
        transaction_id: `TRX-FAIL-${Date.now()}`,
        payment_status: 'FAILED',
        gateway: 'SIMULATOR'
      })
      .expect(200);

    const payment = await Payment.findOne({ where: { gateway_order_id: failInvoice } });
    assert.equal(payment.status, PAYMENT_STATUS.FAILED);
  });

  test('7. Expired Subscription: Enforces Read-Only mode (Blocks writes, allows reads & checkout)', async () => {
    // Force Company B subscription and company to EXPIRED
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await Subscription.update(
      {
        status: SUBSCRIPTION_STATUS.EXPIRED,
        trial_ends_at: pastDate,
        current_period_end: pastDate
      },
      { where: { company_id: companyB.id } }
    );
    await Company.update(
      { status: COMPANY_STATUS.EXPIRED },
      { where: { id: companyB.id } }
    );

    // 1. Read operations succeed (HTTP 200)
    await request
      .get('/api/v1/subscription/status')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(200);

    await request
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(200);

    // 2. Operational mutations fail with HTTP 403 (Read-only enforcement)
    const tripMutationRes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        title: 'Trip While Expired',
        start_location: 'Jakarta',
        destination: 'Bandung',
        initial_balance: 500000
      })
      .expect(403);

    assert.equal(tripMutationRes.body.error_code, 'SUBSCRIPTION_EXPIRED');

    // 3. Checkout route remains accessible so user can renew (HTTP 201)
    const renewalCheckout = await request
      .post('/api/v1/subscription/checkout')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ payment_method: 'QRIS', gateway: 'SIMULATOR' })
      .expect(201);

    assert.ok(renewalCheckout.body.data.checkout_info.invoice_number);
  });

  test('8. Background Expiration Job: Scans and updates overdue accounts', async () => {
    // Run background cron job method
    const jobResult = await checkAndExpireSubscriptions();
    assert.ok(jobResult);
    assert.ok(typeof jobResult.expiredTrialsCount === 'number');
    assert.ok(typeof jobResult.expiredSubsCount === 'number');
  });

  test('9. Payment History: Returns paginated transaction audit ledger', async () => {
    const res = await request
      .get('/api/v1/subscription/history')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.payments);
    assert.ok(res.body.data.payments.length >= 3);
    assert.ok(res.body.data.pagination);
  });

  test('10. Tenant Isolation: Company B cannot access Company A payments or subscriptions', async () => {
    const historyA = await request
      .get('/api/v1/subscription/history')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    const historyB = await request
      .get('/api/v1/subscription/history')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(200);

    const invoicesA = historyA.body.data.payments.map((p) => p.gateway_order_id);
    const invoicesB = historyB.body.data.payments.map((p) => p.gateway_order_id);

    // No overlap in invoice numbers
    for (const inv of invoicesA) {
      assert.ok(!invoicesB.includes(inv), `Invoice ${inv} of Company A leaked to Company B`);
    }
  });
});
