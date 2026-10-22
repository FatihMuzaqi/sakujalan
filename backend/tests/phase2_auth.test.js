import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { sequelize, User, Company, CompanyMember, Subscription, Plan } from '../model/index.js';
import { ROLES, SUBSCRIPTION_STATUS, USER_STATUS, MEMBER_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

const request = supertest(app);

describe('PHASE 2: Authentication & Identity Comprehensive Test Suite', () => {
  let registeredUser;
  let registeredCompany;
  let authToken;
  const testEmail = `owner_${Date.now()}@nusantara.com`;
  const testPassword = 'SecurePassword123!';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();
  });

  after(async () => {
    await sequelize.close();
  });

  // Test 1: Register
  test('1. Register: Should register User, Company, CompanyMember (OWNER), and 30-day Trial Subscription in transaction', async () => {
    const payload = {
      name: 'Budi Pratama',
      email: testEmail,
      password: testPassword,
      phone: '081234567890',
      company_name: 'PT Nusantara Jaya Express',
      company_email: `info_${Date.now()}@nusantarajaya.com`,
      company_phone: '0215551234',
      company_address: 'Jl. Jendral Sudirman No. 45, Jakarta'
    };

    const res = await request
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.ok(res.body.data.company);
    assert.ok(res.body.data.member);
    assert.ok(res.body.data.subscription);
    assert.ok(res.body.data.tokens.access_token);

    registeredUser = res.body.data.user;
    registeredCompany = res.body.data.company;
    authToken = res.body.data.tokens.access_token;

    assert.equal(registeredUser.email, testEmail.toLowerCase());
    assert.equal(registeredUser.name, 'Budi Pratama');
    assert.equal(registeredCompany.name, 'PT Nusantara Jaya Express');
  });

  // Test 2: Duplicate Email
  test('2. Duplicate Email: Should reject registration with duplicate email (409 Conflict)', async () => {
    const duplicatePayload = {
      name: 'Duplicate User',
      email: testEmail,
      password: 'AnotherPassword123!',
      company_name: 'PT Inovasi Baru'
    };

    const res = await request
      .post('/api/v1/auth/register')
      .send(duplicatePayload)
      .expect(409);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'EMAIL_ALREADY_EXISTS');
  });

  // Test 3: Login Valid
  test('3. Login Valid: Should login successfully with valid credentials and return minimal JWT', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.tokens.access_token);
    assert.equal(res.body.data.user.id, registeredUser.id);
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());
  });

  // Test 4: Login Invalid
  test('4. Login Invalid: Should reject login with wrong password or non-existent email (401 Unauthorized)', async () => {
    // Wrong Password
    const wrongPassRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'IncorrectPassword'
      })
      .expect(401);

    assert.equal(wrongPassRes.body.success, false);
    assert.equal(wrongPassRes.body.error_code, 'INVALID_CREDENTIALS');

    // Non-existent email
    const nonExistentRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'ghost_user@nonexistent.com',
        password: testPassword
      })
      .expect(401);

    assert.equal(nonExistentRes.body.success, false);
    assert.equal(nonExistentRes.body.error_code, 'INVALID_CREDENTIALS');
  });

  // Test 5: Password Hashing
  test('5. Password Hashing: Password must be hashed using bcrypt in database and never leaked', async () => {
    const dbUser = await User.findByPk(registeredUser.id);
    assert.ok(dbUser);
    assert.notEqual(dbUser.password, testPassword);
    assert.ok(dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$'));

    // Verify bcrypt hash matches
    const isBcryptValid = await bcrypt.compare(testPassword, dbUser.password);
    assert.equal(isBcryptValid, true);

    // Verify password is omitted in JSON serialization
    const userJson = dbUser.toJSON();
    assert.equal(userJson.password, undefined);
  });

  // Test 6: JWT Verification
  test('6. JWT Verification: Protected route GET /api/v1/auth/me should verify JWT and return profile', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.id, registeredUser.id);
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());
    assert.equal(res.body.data.company.id, registeredCompany.id);
    assert.equal(res.body.data.role, ROLES.OWNER);
  });

  // Test 7: Unauthorized Request
  test('7. Unauthorized Request: Should reject protected requests without token or with invalid token (401)', async () => {
    // Missing token
    const noTokenRes = await request
      .get('/api/v1/auth/me')
      .expect(401);

    assert.equal(noTokenRes.body.success, false);
    assert.equal(noTokenRes.body.error_code, 'UNAUTHORIZED');

    // Invalid/Tampered token
    const invalidTokenRes = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid_tampered_token_string')
      .expect(401);

    assert.equal(invalidTokenRes.body.success, false);
    assert.equal(invalidTokenRes.body.error_code, 'TOKEN_INVALID');
  });

  // Test 8: Company Isolation
  test('8. Company Isolation: Users from different companies must be strictly isolated', async () => {
    // Register second independent company
    const companyBEmail = `ownerB_${Date.now()}@solusi.com`;
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Siti Rahma',
        email: companyBEmail,
        password: 'PasswordB123!',
        company_name: 'PT Solusi Mandiri'
      })
      .expect(201);

    const tokenB = regB.body.data.tokens.access_token;
    const companyB = regB.body.data.company;

    // Company B token gets Company B profile
    const profileB = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    assert.equal(profileB.body.data.company.id, companyB.id);
    assert.notEqual(profileB.body.data.company.id, registeredCompany.id);

    // Verify company isolation in database
    const usersInCompanyA = await User.findAll({ where: { company_id: registeredCompany.id } });
    const usersInCompanyB = await User.findAll({ where: { company_id: companyB.id } });

    assert.equal(usersInCompanyA.some(u => u.email === companyBEmail), false);
    assert.equal(usersInCompanyB.some(u => u.email === testEmail), false);
  });

  // Test 9: OWNER Role
  test('9. OWNER Role: Registering user must be assigned OWNER role in both users and company_members', async () => {
    const member = await CompanyMember.findOne({
      where: {
        company_id: registeredCompany.id,
        user_id: registeredUser.id
      }
    });

    assert.ok(member);
    assert.equal(member.role, ROLES.OWNER);
    assert.equal(member.status, MEMBER_STATUS.ACTIVE);

    const user = await User.findByPk(registeredUser.id);
    assert.equal(user.role, ROLES.OWNER);
  });

  // Test 10: Automatic 30-Day Trial
  test('10. Automatic 30-day Trial: Subscription must be created with status TRIAL and 30-day duration', async () => {
    const subscription = await Subscription.findOne({
      where: { company_id: registeredCompany.id },
      include: [{ model: Plan, as: 'plan' }]
    });

    assert.ok(subscription);
    assert.equal(subscription.status, SUBSCRIPTION_STATUS.TRIAL);
    assert.ok(subscription.trial_started_at);
    assert.ok(subscription.trial_ends_at);

    // Calculate trial duration in days
    const startTime = new Date(subscription.trial_started_at).getTime();
    const endTime = new Date(subscription.trial_ends_at).getTime();
    const diffDays = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));

    assert.equal(diffDays, 30);
    assert.equal(subscription.plan.code, 'MONTHLY');
    assert.equal(Number(subscription.plan.price), 50000);
  });

  // Test 11: Logout endpoint
  test('11. Logout: POST /api/v1/auth/logout should return success', async () => {
    const res = await request
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Logged out successfully');
  });

  // Test 12: Google OAuth - New User Automatic Owner Registration with 30-day Trial
  test('12. Google OAuth: New user creates Company, Owner, and 30-day Trial', async () => {
    const googleEmail = `google_${Date.now()}@gmail.com`;
    const res = await request
      .post('/api/v1/auth/google')
      .send({
        email: googleEmail,
        name: 'Google Owner User',
        google_id: 'google_oauth_123456789',
        photo_url: 'https://lh3.googleusercontent.com/a/sample_photo',
        company_name: 'PT Google Partner Global'
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_new_user, true);
    assert.equal(res.body.data.user.email, googleEmail);
    assert.equal(res.body.data.user.role, ROLES.OWNER);
    assert.equal(res.body.data.company.name, 'PT Google Partner Global');
    assert.equal(res.body.data.subscription.status, SUBSCRIPTION_STATUS.TRIAL);
    assert.ok(res.body.data.tokens.access_token);
  });

  // Test 13: Google OAuth - Existing User Login
  test('13. Google OAuth: Existing user logs in and returns tokens', async () => {
    const res = await request
      .post('/api/v1/auth/google')
      .send({
        email: testEmail,
        name: 'Budi Pratama'
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_new_user, false);
    assert.equal(res.body.data.user.email, testEmail.toLowerCase());
    assert.ok(res.body.data.tokens.access_token);
  });
});
