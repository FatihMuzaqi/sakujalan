import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../app.js';
import { sequelize, User, Company, CompanyMember, Subscription, Plan } from '../model/index.js';
import { ROLES, SUBSCRIPTION_STATUS, USER_STATUS, COMPANY_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';
import { seedDefaultSuperAdmin } from '../services/superadmin.service.js';

const request = supertest(app);

describe('PHASE 11: SuperAdmin Portal - Subscription Pricing & Password Reset Comprehensive Test Suite', () => {
  let superAdminToken;
  let superAdminUser;
  let regularOwnerToken;
  let regularOwnerUser;
  let testCompany;
  let testMonthlyPlan;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();
    await seedDefaultSuperAdmin();

    // 1. Login as SuperAdmin
    const adminLoginRes = await request
      .post('/api/v1/superadmin/auth/login')
      .send({
        email: process.env.SUPERADMIN_EMAIL || 'superadmin@tripex.id',
        password: process.env.SUPERADMIN_PASSWORD || 'superadmin123'
      })
      .expect(200);

    superAdminToken = adminLoginRes.body.data.accessToken;
    superAdminUser = adminLoginRes.body.data.user;

    // 2. Register a Tenant Partner Company with Owner
    const registerRes = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Hendra Mitra',
        email: 'hendra@mitraexpress.com',
        password: 'InitialPassword123!',
        phone: '081299887766',
        company_name: 'PT Mitra Express Logistik',
        company_email: 'info@mitraexpress.com',
        company_phone: '02177889900',
        company_address: 'Gedung Wisma Niaga Lt. 5, Jakarta Selatan'
      })
      .expect(201);

    regularOwnerToken = registerRes.body.data.tokens.access_token;
    regularOwnerUser = registerRes.body.data.user;
    testCompany = registerRes.body.data.company;

    testMonthlyPlan = await Plan.findOne({ where: { code: 'MONTHLY' } });
  });

  after(async () => {
    await sequelize.close();
  });

  test('1. SuperAdmin Login: Should authenticate and return token with isSuperAdmin claim', async () => {
    assert.ok(superAdminToken);
    assert.equal(superAdminUser.role, ROLES.SUPER_ADMIN);
  });

  test('2. Plan Management: GET /api/v1/superadmin/plans should list all SaaS plans with active subscriber count', async () => {
    const res = await request
      .get('/api/v1/superadmin/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);

    const monthly = res.body.data.find(p => p.code === 'MONTHLY');
    assert.ok(monthly);
    assert.equal(typeof monthly.price, 'number');
    assert.ok(monthly.activeSubscribers >= 1);
  });

  test('3. Plan Monthly Price Update: PATCH /api/v1/superadmin/plans/:id/price should update monthly price', async () => {
    const res = await request
      .patch(`/api/v1/superadmin/plans/${testMonthlyPlan.id}/price`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ price: 75000 })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.price, 75000);

    // Verify in database
    const updatedPlan = await Plan.findByPk(testMonthlyPlan.id);
    assert.equal(parseFloat(updatedPlan.price), 75000);
  });

  test('4. Full Plan Update: PATCH /api/v1/superadmin/plans/:id should update name, trial_days, and limits', async () => {
    const res = await request
      .patch(`/api/v1/superadmin/plans/${testMonthlyPlan.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'TripEx Enterprise Pro Monthly',
        price: 99000,
        trial_days: 45,
        max_users: 100
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'TripEx Enterprise Pro Monthly');
    assert.equal(res.body.data.price, 99000);
    assert.equal(res.body.data.trial_days, 45);
    assert.equal(res.body.data.max_users, 100);
  });

  test('5. Company Subscription Override: PATCH /api/v1/superadmin/companies/:id/subscription should activate & extend subscription period', async () => {
    const res = await request
      .patch(`/api/v1/superadmin/companies/${testCompany.id}/subscription`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        action: 'ACTIVATE',
        days: 60,
        reason: 'Promo VIP Mitra 2 Bulan Gratis dari SuperAdmin'
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.company.status, COMPANY_STATUS.ACTIVE);
    assert.equal(res.body.data.subscription.status, SUBSCRIPTION_STATUS.ACTIVE);
    assert.ok(res.body.data.subscription.current_period_end);

    // Verify company in database
    const comp = await Company.findByPk(testCompany.id);
    assert.equal(comp.status, COMPANY_STATUS.ACTIVE);
  });

  test('6. User Listing: GET /api/v1/superadmin/users should return all platform users across tenants', async () => {
    const res = await request
      .get('/api/v1/superadmin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);
    assert.ok(res.body.meta);
  });

  test('7. Reset User Password: POST /api/v1/superadmin/users/:id/reset-password should reset partner password and allow login', async () => {
    const newMitraPassword = 'NewSecretPassword2026!';

    const res = await request
      .post(`/api/v1/superadmin/users/${regularOwnerUser.id}/reset-password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ new_password: newMitraPassword })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, regularOwnerUser.id);

    // Verify user can now login with new password
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: regularOwnerUser.email,
        password: newMitraPassword
      })
      .expect(200);

    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.data.tokens.access_token);
  });

  test('8. Reset Owner Password Shortcut: POST /api/v1/superadmin/companies/:id/reset-owner-password should reset owner password by company ID', async () => {
    const anotherPassword = 'AnotherSecretPassword2026!';

    const res = await request
      .post(`/api/v1/superadmin/companies/${testCompany.id}/reset-owner-password`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ new_password: anotherPassword })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, regularOwnerUser.email);

    // Verify login with latest password
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: regularOwnerUser.email,
        password: anotherPassword
      })
      .expect(200);

    assert.equal(loginRes.body.success, true);
  });

  test('9. SuperAdmin Change Password: PATCH /api/v1/superadmin/profile/password should update admin password', async () => {
    const newAdminPass = 'SuperAdminBrandNewPass2026!';

    const res = await request
      .patch('/api/v1/superadmin/profile/password')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        current_password: process.env.SUPERADMIN_PASSWORD || 'superadmin123',
        new_password: newAdminPass
      })
      .expect(200);

    assert.equal(res.body.success, true);

    // Verify SuperAdmin can login with new password
    const loginRes = await request
      .post('/api/v1/superadmin/auth/login')
      .send({
        email: superAdminUser.email,
        password: newAdminPass
      })
      .expect(200);

    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.data.accessToken);
  });

  test('10. Security Enforcement: Regular Owner token should be rejected with 403 Forbidden on superadmin endpoints', async () => {
    await request
      .get('/api/v1/superadmin/plans')
      .set('Authorization', `Bearer ${regularOwnerToken}`)
      .expect(403);

    await request
      .patch(`/api/v1/superadmin/plans/${testMonthlyPlan.id}/price`)
      .set('Authorization', `Bearer ${regularOwnerToken}`)
      .send({ price: 10000 })
      .expect(403);

    await request
      .post(`/api/v1/superadmin/users/${regularOwnerUser.id}/reset-password`)
      .set('Authorization', `Bearer ${regularOwnerToken}`)
      .send({ new_password: 'HackedPassword123' })
      .expect(403);
  });
});
