import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../app.js';
import { sequelize, User, Company, CompanyMember, Subscription } from '../model/index.js';
import { ROLES, MEMBER_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

const request = supertest(app);

describe('PHASE 3: Company, Members & Roles Comprehensive Test Suite', () => {
  let companyA, ownerA, tokenA;
  let companyB, ownerB, tokenB;
  let officerA, tokenOfficerA;
  let createdMemberId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();

    // Register Company A (with Owner A)
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Ahmad Owner A',
        email: `ahmad_${Date.now()}@companya.com`,
        password: 'Password123!',
        company_name: 'PT Perdana Mandiri A'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenA = regA.body.data.tokens.access_token;

    // Register Company B (with Owner B)
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Budi Owner B',
        email: `budi_${Date.now()}@companyb.com`,
        password: 'Password123!',
        company_name: 'PT Surya Sejahtera B'
      })
      .expect(201);

    companyB = regB.body.data.company;
    ownerB = regB.body.data.user;
    tokenB = regB.body.data.tokens.access_token;

    // Add an Officer in Company A
    const addOfficerRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Doni Officer',
        email: `doni_${Date.now()}@companya.com`,
        password: 'TempPassword123!',
        role: ROLES.OFFICER,
        phone: '081299990001'
      })
      .expect(201);

    // Login as Officer A to obtain token
    const loginOfficer = await request
      .post('/api/v1/auth/login')
      .send({
        email: addOfficerRes.body.data.email,
        password: 'TempPassword123!'
      })
      .expect(200);

    officerA = loginOfficer.body.data.user;
    tokenOfficerA = loginOfficer.body.data.tokens.access_token;
  });

  after(async () => {
    await sequelize.close();
  });

  // Test 1: GET /api/v1/company (Read Profile)
  test('1. GET /api/v1/company: Should retrieve company profile and subscription info', async () => {
    const res = await request
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.company.id, companyA.id);
    assert.equal(res.body.data.company.name, 'PT Perdana Mandiri A');
    assert.ok(res.body.data.subscription_info);
    assert.equal(res.body.data.subscription_info.status, 'TRIAL');
    assert.equal(res.body.data.subscription_info.days_remaining, 30);
  });

  // Test 2: PUT /api/v1/company (Update Profile)
  test('2. PUT /api/v1/company: Owner can update company details', async () => {
    const res = await request
      .put('/api/v1/company')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'PT Perdana Mandiri Perkasa',
        phone: '0217778899',
        address: 'Gedung Cyber 2 Lantai 15, Jakarta Selatan'
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'PT Perdana Mandiri Perkasa');
    assert.equal(res.body.data.phone, '0217778899');
    assert.equal(res.body.data.address, 'Gedung Cyber 2 Lantai 15, Jakarta Selatan');
  });

  // Test 3: Role Authorization on PUT /api/v1/company
  test('3. Authorization: Officer is forbidden from updating company profile (403 Forbidden)', async () => {
    const res = await request
      .put('/api/v1/company')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        name: 'Hacked Company Name'
      })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'ROLE_FORBIDDEN');
  });

  // Test 4: POST /api/v1/company/members (Create Member)
  test('4. POST /api/v1/company/members: Owner can add new member with temporary password', async () => {
    const res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Maya Manager',
        email: `maya_${Date.now()}@companya.com`,
        password: 'TempPassword456!',
        role: ROLES.MANAGER,
        phone: '081288880002'
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, 'Maya Manager');
    assert.equal(res.body.data.role, ROLES.MANAGER);
    assert.equal(res.body.data.status, MEMBER_STATUS.ACTIVE);
    assert.equal(res.body.data.company_id, companyA.id);

    createdMemberId = res.body.data.id;
  });

  // Test 5: Duplicate Member Rejection
  test('5. Duplicate Member: Adding existing member in the same company is rejected (409 Conflict)', async () => {
    // Get existing member email
    const member = await CompanyMember.findByPk(createdMemberId, { include: [{ model: User, as: 'user' }] });

    const res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Maya Duplicate',
        email: member.user.email,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(409);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'MEMBER_ALREADY_EXISTS');
  });

  // Test 6: GET /api/v1/company/members (List Members)
  test('6. GET /api/v1/company/members: Should list all members in authenticated company', async () => {
    const res = await request
      .get('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 3); // Owner + Officer + Manager

    // All members must belong to Company A
    assert.ok(res.body.data.every(m => m.company_id === companyA.id));
  });

  // Test 7: PUT /api/v1/company/members/:id (Update Member Role & Info)
  test('7. PUT /api/v1/company/members/:id: Owner can update member role and status', async () => {
    const res = await request
      .put(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Maya Senior Manager',
        role: ROLES.ADMIN,
        phone: '081299999999'
      })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Maya Senior Manager');
    assert.equal(res.body.data.role, ROLES.ADMIN);
    assert.equal(res.body.data.phone, '081299999999');
  });

  // Test 8: Role Restriction on Member Management
  test('8. Role Restriction: Officer cannot add, update, or delete members (403 Forbidden)', async () => {
    // Attempt add
    const addRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({
        name: 'Unauthorized Member',
        email: 'unauth@companya.com',
        password: 'Password123!'
      })
      .expect(403);
    assert.equal(addRes.body.error_code, 'ROLE_FORBIDDEN');

    // Attempt update
    const updateRes = await request
      .put(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .send({ role: ROLES.OWNER })
      .expect(403);
    assert.equal(updateRes.body.error_code, 'ROLE_FORBIDDEN');

    // Attempt delete
    const deleteRes = await request
      .delete(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenOfficerA}`)
      .expect(403);
    assert.equal(deleteRes.body.error_code, 'ROLE_FORBIDDEN');
  });

  // Test 9: Tenant Isolation
  test('9. Tenant Isolation: Company B Owner CANNOT see, edit, or delete Company A members', async () => {
    // Company B cannot update Company A member
    const updateRes = await request
      .put(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked By Company B' })
      .expect(404);
    assert.equal(updateRes.body.error_code, 'MEMBER_NOT_FOUND');

    // Company B cannot delete Company A member
    const deleteRes = await request
      .delete(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    assert.equal(deleteRes.body.error_code, 'MEMBER_NOT_FOUND');

    // Company B member list does not contain Company A members
    const listRes = await request
      .get('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    assert.ok(listRes.body.data.every(m => m.company_id === companyB.id));
    assert.ok(!listRes.body.data.some(m => m.id === createdMemberId));
  });

  // Test 10: Cannot Delete Company Owner
  test('10. Protection: Cannot delete Company Owner', async () => {
    const ownerMember = await CompanyMember.findOne({
      where: { company_id: companyA.id, role: ROLES.OWNER }
    });

    const res = await request
      .delete(`/api/v1/company/members/${ownerMember.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'CANNOT_DELETE_OWNER');
  });

  // Test 11: DELETE /api/v1/company/members/:id (CRUD Delete)
  test('11. DELETE /api/v1/company/members/:id: Owner can successfully remove member', async () => {
    const res = await request
      .delete(`/api/v1/company/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Member removed successfully from company');

    // Verify member no longer exists
    const deleted = await CompanyMember.findByPk(createdMemberId);
    assert.equal(deleted, null);
  });
});
