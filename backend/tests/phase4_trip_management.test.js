import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../app.js';
import { sequelize, User, Company, Trip, TripMember } from '../model/index.js';
import { ROLES, TRIP_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

const request = supertest(app);

describe('PHASE 4: Trip Management & State Machine Comprehensive Test Suite', () => {
  let companyA, ownerA, tokenOwnerA;
  let managerA, tokenManagerA;
  let officerA1, tokenOfficerA1;
  let officerA2, tokenOfficerA2;
  let companyB, tokenOwnerB;

  let draftTripId;
  let scheduledTripId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();

    // Register Company A
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Budi Owner',
        email: `owner_${Date.now()}@tripsa.com`,
        password: 'Password123!',
        company_name: 'PT Logistik Express Utama'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // Register Company B
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Joko Owner B',
        email: `owner_${Date.now()}@tripsb.com`,
        password: 'Password123!',
        company_name: 'PT Solusi Sejahtera B'
      })
      .expect(201);

    companyB = regB.body.data.company;
    tokenOwnerB = regB.body.data.tokens.access_token;

    // Add Manager to Company A
    const addManagerRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Ibu Maya Manager',
        email: `maya_${Date.now()}@tripsa.com`,
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

    // Add Officer 1 to Company A
    const addOfficer1Res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Doni Officer 1',
        email: `doni_${Date.now()}@tripsa.com`,
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

    // Add Officer 2 to Company A
    const addOfficer2Res = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Rian Officer 2',
        email: `rian_${Date.now()}@tripsa.com`,
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
  });

  after(async () => {
    await sequelize.close();
  });

  // Test 1: Create Unassigned Trip (Status: DRAFT)
  test('1. Create Trip (DRAFT): Manager creates trip without officer -> status is DRAFT', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Pengiriman Kargo Surabaya',
        description: 'Audit dan pengiriman dokumen logistik cabang Surabaya',
        start_location: 'Jakarta',
        destination: 'Surabaya',
        start_at: new Date(Date.now() + 86400000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        initial_balance: 1500000
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.trip_code);
    assert.ok(res.body.data.trip_code.startsWith('TRP-'));
    assert.equal(res.body.data.status, TRIP_STATUS.DRAFT);
    assert.equal(parseFloat(res.body.data.initial_balance), 1500000);
    assert.equal(parseFloat(res.body.data.remaining_budget), 1500000);

    draftTripId = res.body.data.id;
  });

  // Test 2: Create Assigned Trip (Status: SCHEDULED)
  test('2. Create Trip (SCHEDULED): Manager creates trip with assigned officer -> status is SCHEDULED', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Inspeksi Lapangan Bandung',
        description: 'Pemeriksaan armada logistik',
        start_location: 'Jakarta Barat',
        destination: 'Bandung',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        initial_balance: 750000,
        officer_id: officerA1.id
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, TRIP_STATUS.SCHEDULED);
    assert.equal(res.body.data.officer_id, officerA1.id);
    assert.ok(res.body.data.members.some(m => m.user_id === officerA1.id));

    scheduledTripId = res.body.data.id;
  });

  // Test 3: Officer cannot create trips (RBAC check)
  test('3. RBAC: Officer cannot create trips (403 Forbidden)', async () => {
    const res = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        title: 'Unauthorized Trip',
        start_location: 'Jakarta',
        destination: 'Bandung',
        start_at: new Date().toISOString(),
        end_at: new Date().toISOString()
      })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'ROLE_FORBIDDEN');
  });

  // Test 4: Assign Officer to DRAFT Trip -> Transitions to SCHEDULED
  test('4. Assign Officer: Assigning officer transitions DRAFT trip to SCHEDULED', async () => {
    const res = await request
      .post(`/api/v1/trips/${draftTripId}/assign`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ officer_id: officerA2.id })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, TRIP_STATUS.SCHEDULED);
    assert.equal(res.body.data.officer_id, officerA2.id);

    // Verify TripMember was created
    const member = await TripMember.findOne({
      where: { trip_id: draftTripId, user_id: officerA2.id }
    });
    assert.ok(member);
  });

  // Test 5: Officer 2 cannot start Officer 1's scheduled trip
  test('5. RBAC Guard: Officer 2 cannot start Officer 1 assigned trip (403 Forbidden)', async () => {
    const res = await request
      .post(`/api/v1/trips/${scheduledTripId}/start`)
      .set('Authorization', `Bearer ${tokenOfficerA2}`)
      .expect(403);

    assert.equal(res.body.success, false);
  });

  // Test 6: Assigned Officer starts trip (SCHEDULED -> ACTIVE)
  test('6. Start Trip: Assigned Officer starts trip (SCHEDULED -> ACTIVE)', async () => {
    const res = await request
      .post(`/api/v1/trips/${scheduledTripId}/start`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, TRIP_STATUS.ACTIVE);
  });

  // Test 7: Invalid State Machine Transition Rejection
  test('7. State Machine Guard: Rejects invalid transitions (e.g. DRAFT/SCHEDULED -> COMPLETED)', async () => {
    // Attempting to complete a trip that is SCHEDULED (not yet ACTIVE)
    const res = await request
      .put(`/api/v1/trips/${draftTripId}/status`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ status: TRIP_STATUS.COMPLETED })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'INVALID_STATUS_TRANSITION');
  });

  // Test 8: Complete Trip (ACTIVE -> COMPLETED)
  test('8. Complete Trip: Assigned Officer completes trip (ACTIVE -> COMPLETED)', async () => {
    const res = await request
      .post(`/api/v1/trips/${scheduledTripId}/complete`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, TRIP_STATUS.COMPLETED);
  });

  // Test 9: Locked Trip: Cannot modify COMPLETED trip
  test('9. Locked State: Cannot update details of COMPLETED trip (400 Bad Request)', async () => {
    const res = await request
      .put(`/api/v1/trips/${scheduledTripId}`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ title: 'Modified Completed Trip' })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error_code, 'TRIP_LOCKED');
  });

  // Test 10: Officer Dashboard
  test('10. Officer Dashboard: Returns active trip, destination, remaining balance, and expense summary', async () => {
    // Start Officer 2's trip first so it is ACTIVE
    await request
      .post(`/api/v1/trips/${draftTripId}/start`)
      .set('Authorization', `Bearer ${tokenOfficerA2}`)
      .expect(200);

    const res = await request
      .get('/api/v1/trips/officer/dashboard')
      .set('Authorization', `Bearer ${tokenOfficerA2}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.has_active_trip, true);
    assert.equal(res.body.data.active_trip.id, draftTripId);
    assert.equal(res.body.data.active_trip.destination, 'Surabaya');
    assert.equal(res.body.data.active_trip.status, TRIP_STATUS.ACTIVE);
    assert.equal(res.body.data.active_trip.remaining_balance, 1500000);
  });

  // Test 11: Tenant Isolation
  test('11. Tenant Isolation: Company B cannot access or mutate Company A trips', async () => {
    // Company B tries to view Company A trip
    const getRes = await request
      .get(`/api/v1/trips/${draftTripId}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(404);
    assert.equal(getRes.body.error_code, 'TRIP_NOT_FOUND');

    // Company B tries to mutate Company A trip
    const putRes = await request
      .put(`/api/v1/trips/${draftTripId}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ title: 'Company B Hijack' })
      .expect(404);
    assert.equal(putRes.body.error_code, 'TRIP_NOT_FOUND');
  });

  // Test 12: Delete / Cancel Trip
  test('12. Delete Trip: Manager can cancel active trip or delete draft trip', async () => {
    const res = await request
      .delete(`/api/v1/trips/${draftTripId}`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.equal(res.body.success, true);

    const updated = await Trip.findByPk(draftTripId);
    assert.equal(updated.status, TRIP_STATUS.CANCELLED);
  });
});
