import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import supertest from 'supertest';
import app from '../app.js';
import { initializeSocket } from '../services/socket.service.js';
import { sequelize, User, Company, Subscription, Plan } from '../model/index.js';
import { ROLES, COMPANY_STATUS, SUBSCRIPTION_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';
import { expireSubscription, activateSubscription } from '../services/subscription.service.js';

describe('PHASE 12: Subscription Access Control - Trip Creation & Member Login Restriction Test Suite', () => {
  let server;
  let serverUrl;
  let request;

  let company, owner, tokenOwner;
  let officer, tokenOfficer;
  let officerPassword = 'Password123!';
  let officerEmail;

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

    // 1. Register Company with Owner (starts in 30-Day Trial)
    const regOwner = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Budi Owner',
        email: `owner_${Date.now()}@tripex-test.id`,
        password: 'Password123!',
        company_name: 'PT Ekspedisi Maju Lancar'
      })
      .expect(201);

    company = regOwner.body.data.company;
    owner = regOwner.body.data.user;
    tokenOwner = regOwner.body.data.tokens.access_token;

    // 2. Owner creates an Officer (Anggota)
    officerEmail = `officer_${Date.now()}@tripex-test.id`;
    const resOfficer = await request
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Siti Petugas Lapangan',
        email: officerEmail,
        password: officerPassword,
        phone: '081234567890',
        role: ROLES.OFFICER
      })
      .expect(201);

    officer = resOfficer.body.data;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await sequelize.close();
  });

  test('1. Active Trial: Officer should be able to login and acquire valid token', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: officerEmail,
        password: officerPassword
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.role, ROLES.OFFICER);
    tokenOfficer = res.body.data.token;
  });

  test('2. Active Trial: Owner should be able to create a new trip', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        title: 'Pengiriman Kargo Jakarta ke Bandung',
        start_location: 'Jakarta Gudang Utama',
        destination: 'Bandung Distribusi',
        start_at: new Date(Date.now() + 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000).toISOString(),
        initial_balance: 500000,
        officer_id: officer.id
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.trip_code);
    assert.equal(res.body.data.title, 'Pengiriman Kargo Jakarta ke Bandung');
  });

  test('3. Expiration: Manually expire subscription and verify state', async () => {
    await expireSubscription(company.id);

    const updatedSub = await Subscription.findOne({
      where: { company_id: company.id },
      order: [['created_at', 'DESC']]
    });

    assert.equal(updatedSub.status, SUBSCRIPTION_STATUS.EXPIRED);
  });

  test('4. Expired Subscription: Officer (Anggota) login MUST BE BLOCKED with 403 COMPANY_SUBSCRIPTION_EXPIRED', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: officerEmail,
        password: officerPassword
      })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'COMPANY_SUBSCRIPTION_EXPIRED');
    assert.ok(res.body.message.includes('kadaluarsa'));
  });

  test('5. Expired Subscription: Officer existing session token MUST BE BLOCKED with 403 COMPANY_SUBSCRIPTION_EXPIRED', async () => {
    const res = await request
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOfficer}`)
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'COMPANY_SUBSCRIPTION_EXPIRED');
  });

  test('6. Expired Subscription: Owner CAN STILL LOGIN (Read-Only access to pay/renew)', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: owner.email,
        password: 'Password123!'
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    tokenOwner = res.body.data.token;
  });

  test('7. Expired Subscription: Creating a new Trip MUST BE BLOCKED with 403 SUBSCRIPTION_EXPIRED', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        title: 'Trip Baru Saat Expired',
        start_location: 'Jakarta',
        destination: 'Surabaya',
        start_at: new Date(Date.now() + 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000).toISOString(),
        initial_balance: 1000000
      })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'SUBSCRIPTION_EXPIRED');
  });

  test('8. Renewal / Reactivation: Activate subscription and verify restoration', async () => {
    const plan = await Plan.findOne({ where: { is_active: true } });
    await activateSubscription(company.id, plan.id, 30);

    const sub = await Subscription.findOne({
      where: { company_id: company.id },
      order: [['created_at', 'DESC']]
    });

    assert.equal(sub.status, SUBSCRIPTION_STATUS.ACTIVE);
  });

  test('9. Reactivated: Officer (Anggota) can login again successfully', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: officerEmail,
        password: officerPassword
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    tokenOfficer = res.body.data.token;
  });

  test('10. Reactivated: Officer token can access API endpoints again', async () => {
    const res = await request
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOfficer}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('11. Reactivated: Owner can create a new Trip again successfully', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        title: 'Pengiriman Kargo Jakarta ke Semarang Setelah Langganan Aktif',
        start_location: 'Jakarta Gudang Utama',
        destination: 'Semarang Hub',
        start_at: new Date(Date.now() + 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000).toISOString(),
        initial_balance: 750000,
        officer_id: officer.id
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.trip_code);
    assert.equal(res.body.data.title, 'Pengiriman Kargo Jakarta ke Semarang Setelah Langganan Aktif');
  });
});
