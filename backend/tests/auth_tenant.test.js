import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../app.js';
import { sequelize } from '../config/database.js';

import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('SAKULAJAN SaaS - Multi-Tenant Authentication & Isolation Tests', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();
  });

  after(async () => {
    await sequelize.close();
  });

  let companyAToken = '';
  let companyBToken = '';
  let companyAId = '';
  let companyBId = '';
  let officerAToken = '';

  it('1. Should register Company A and grant 30-day Free Trial with OWNER role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Maju Bersama Logistik',
        company_email: 'info@majubersama.com',
        owner_name: 'Budi Santoso',
        owner_email: 'budi@majubersama.com',
        owner_password: 'password123',
        owner_phone: '08123456789'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.company.status, 'TRIAL');
    assert.ok(res.body.data.subscription.trial_ends_at);
    assert.strictEqual(res.body.data.user.role, 'OWNER');
    assert.ok(res.body.data.tokens.access_token);

    companyAToken = res.body.data.tokens.access_token;
    companyAId = res.body.data.company.id;
  });

  it('2. Should register Company B as an independent tenant', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        company_name: 'PT Solusi Distribusi Global',
        company_email: 'info@solusiglobal.com',
        owner_name: 'Dewi Lestari',
        owner_email: 'dewi@solusiglobal.com',
        owner_password: 'password123'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.notStrictEqual(res.body.data.company.id, companyAId);

    companyBToken = res.body.data.tokens.access_token;
    companyBId = res.body.data.company.id;
  });

  it('3. Should create an OFFICER in Company A', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${companyAToken}`)
      .send({
        name: 'Rian Lapangan',
        email: 'rian@majubersama.com',
        password: 'password123',
        role: 'OFFICER',
        phone: '081399887766'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.role, 'OFFICER');
    assert.strictEqual(res.body.data.company_id, companyAId);
  });

  it('4. Should log in as Officer in Company A and receive token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rian@majubersama.com',
        password: 'password123'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'OFFICER');
    officerAToken = res.body.data.tokens.access_token;
  });

  it('5. Tenant Isolation: Company B OWNER cannot see Company A users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${companyBToken}`);

    assert.strictEqual(res.status, 200);
    // Company B must only see 1 user (Dewi Lestari)
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].email, 'dewi@solusiglobal.com');
  });

  it('6. RBAC Guard: OFFICER cannot create new users (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${officerAToken}`)
      .send({
        name: 'Illegal User',
        email: 'illegal@majubersama.com',
        password: 'password123',
        role: 'ADMIN'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error_code, 'ROLE_FORBIDDEN');
  });
});
