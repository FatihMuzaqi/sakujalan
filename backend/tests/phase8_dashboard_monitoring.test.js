import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import supertest from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../app.js';
import { initializeSocket } from '../services/socket.service.js';
import { sequelize, User, Company, Trip, TripLocation, Expense, ExpenseCategory } from '../model/index.js';
import { ROLES, TRIP_STATUS, EXPENSE_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('PHASE 8: Dashboard & Realtime Monitoring Comprehensive Test Suite', () => {
  let server;
  let serverUrl;
  let request;

  let companyA, ownerA, tokenOwnerA;
  let managerA, tokenManagerA;
  let officerA1, tokenOfficerA1;
  let companyB, tokenOwnerB;

  let tripA1, tripA2;
  let socketOwnerA, socketOfficerA1;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    await seedPlans();

    // 1. Create HTTP server with Socket.IO
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

    // 2. Register Company A
    const regA = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Budi Hartono Owner',
        email: `owner_${Date.now()}@ptdash.com`,
        password: 'Password123!',
        company_name: 'PT Dashboard Monitoring Jaya'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // 3. Register Company B for Isolation Tests
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Siti Aminah Owner B',
        email: `owner_${Date.now()}@otherdash.com`,
        password: 'Password123!',
        company_name: 'PT Isolasi Dashboard'
      })
      .expect(201);

    companyB = regB.body.data.company;
    tokenOwnerB = regB.body.data.tokens.access_token;

    // 4. Add Manager to Company A
    const addMgr = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Ibu Ratna Manager',
        email: `ratna_${Date.now()}@ptdash.com`,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(201);

    const loginMgr = await request
      .post('/api/v1/auth/login')
      .send({ email: addMgr.body.data.email, password: 'Password123!' })
      .expect(200);

    managerA = loginMgr.body.data.user;
    tokenManagerA = loginMgr.body.data.tokens.access_token;

    // 5. Add Officer to Company A
    const addOff = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Ahmad Officer',
        email: `ahmad_${Date.now()}@ptdash.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOff = await request
      .post('/api/v1/auth/login')
      .send({ email: addOff.body.data.email, password: 'Password123!' })
      .expect(200);

    officerA1 = loginOff.body.data.user;
    tokenOfficerA1 = loginOff.body.data.tokens.access_token;
  });

  after(async () => {
    if (socketOwnerA?.connected) socketOwnerA.disconnect();
    if (socketOfficerA1?.connected) socketOfficerA1.disconnect();
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  });

  test('1. Setup initial trips, budget, and GPS locations in Company A', async () => {
    // Trip 1: Active Trip assigned to Officer A1 with 1,000,000 initial balance
    const createTrip1 = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Pengantaran Logistik Surabaya',
        start_location: 'Jakarta Hub',
        destination: 'Surabaya Warehouses',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000).toISOString(),
        initial_balance: 1000000,
        officer_id: officerA1.id
      })
      .expect(201);

    tripA1 = createTrip1.body.data;
    assert.ok(tripA1.id);

    // Start Trip 1 -> Status: ACTIVE
    await request
      .put(`/api/v1/trips/${tripA1.id}/status`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({ status: TRIP_STATUS.ACTIVE })
      .expect(200);

    // Trip 2: Scheduled Trip with 500,000 initial balance (assigned to officer)
    const createTrip2 = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Inspeksi Cabang Bandung',
        start_location: 'Jakarta HQ',
        destination: 'Bandung Kantor Cabang',
        start_at: new Date(Date.now() + 172800000).toISOString(),
        end_at: new Date(Date.now() + 259200000).toISOString(),
        initial_balance: 500000,
        officer_id: officerA1.id
      })
      .expect(201);

    tripA2 = createTrip2.body.data;

    // Send a GPS location for Trip 1
    await request
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: tripA1.id,
        latitude: -6.2088,
        longitude: 106.8456,
        speed: 45.5,
        heading: 90.0,
        accuracy: 5.0
      })
      .expect(201);
  });

  test('2. Setup expenses (Draft, Pending, Approved) in Company A', async () => {
    // 1. Expense 1: Approved expense Rp 200,000 (Fuel)
    const exp1 = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: tripA1.id,
        category: 'FUEL',
        amount: 200000,
        description: 'Bensin Pertamax Jakarta - Cikampek'
      })
      .expect(201);

    await request
      .put(`/api/v1/expenses/${exp1.body.data.id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    // 2. Expense 2: Pending expense Rp 150,000 (Toll)
    await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: tripA1.id,
        category: 'TOLL',
        amount: 150000,
        description: 'Tol Trans Jawa Cikampek - Semarang'
      })
      .expect(201);
  });

  test('3. Management Dashboard KPI and aggregation verification', async () => {
    const res = await request
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const data = res.body.data;
    assert.ok(data.kpis);

    // KPI Verification:
    // Total trips: 2 (1 Active, 1 Scheduled)
    assert.equal(data.kpis.active_trips_count, 1);
    assert.equal(data.kpis.scheduled_trips_count, 1);
    assert.equal(data.kpis.total_trips_count, 2);

    // Pending expenses: 1 (Rp 150,000)
    assert.equal(data.kpis.pending_expenses_count, 1);
    assert.equal(data.kpis.pending_expenses_amount, 150000);

    // Total allocated: 1,500,000 (1,000,000 + 500,000)
    assert.equal(data.kpis.total_allocated_budget, 1500000);

    // Total spending (approved): 200,000
    assert.equal(data.kpis.total_spending, 200000);

    // Remaining budget: 1,300,000 (800,000 from Trip 1 + 500,000 from Trip 2)
    assert.equal(data.kpis.remaining_budget, 1300000);

    // Active Officers: 1
    assert.equal(data.kpis.active_officers_count, 1);

    // Active Trips List
    assert.equal(data.active_trips.length, 1);
    assert.equal(data.active_trips[0].id, tripA1.id);
    assert.equal(data.active_trips[0].officer.name, 'Ahmad Officer');
    assert.ok(data.active_trips[0].latest_location);
    assert.equal(data.active_trips[0].latest_location.latitude, -6.2088);

    // Active Trip Map points
    assert.equal(data.active_trip_map.length, 1);
    assert.equal(data.active_trip_map[0].trip_id, tripA1.id);
    assert.equal(data.active_trip_map[0].latitude, -6.2088);

    // Recent Activities feed
    assert.ok(data.recent_activities.length > 0);
    assert.ok(data.recent_activities.some(a => a.type === 'EXPENSE'));
  });

  test('4. Officer Dashboard verification ("Apakah saya sedang bertugas?")', async () => {
    const res = await request
      .get('/api/v1/trips/officer/dashboard')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Officer has active trip
    assert.equal(data.is_on_duty, true);
    assert.ok(data.active_trip);
    assert.equal(data.active_trip.id, tripA1.id);
    assert.equal(data.active_trip.destination, 'Surabaya Warehouses');
    assert.equal(data.active_trip.remaining_budget, 800000);

    // Today expenses should include both the approved and pending expenses for tripA1
    assert.ok(data.today_expenses.length >= 2);
    assert.equal(data.today_total_spent, 350000);
  });

  test('5. Realtime Socket.IO events (balance:update & expense:status)', async () => {
    // Connect Manager socket
    socketOwnerA = Client(serverUrl, {
      auth: { token: tokenOwnerA },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socketOwnerA.on('connect', resolve);
      socketOwnerA.on('connect_error', reject);
    });

    let expenseStatusReceived = null;
    let balanceUpdateReceived = null;

    socketOwnerA.on('expense:status', (data) => {
      expenseStatusReceived = data;
    });

    socketOwnerA.on('balance:update', (data) => {
      balanceUpdateReceived = data;
    });

    // Create a new expense and approve it
    const exp3 = await request
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: tripA1.id,
        category: 'MEALS',
        amount: 50000,
        description: 'Makan Siang Rest Area'
      })
      .expect(201);

    await request
      .put(`/api/v1/expenses/${exp3.body.data.id}/approve`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    // Wait for socket events to arrive
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.ok(expenseStatusReceived, 'Should receive expense:status socket event');
    assert.equal(expenseStatusReceived.status, EXPENSE_STATUS.APPROVED);
    assert.equal(expenseStatusReceived.amount, 50000);

    assert.ok(balanceUpdateReceived, 'Should receive balance:update socket event');
    assert.equal(balanceUpdateReceived.trip_id, tripA1.id);
    assert.equal(balanceUpdateReceived.remaining_budget, 750000);
  });

  test('6. Tenant Isolation: Company B dashboard is completely isolated', async () => {
    const res = await request
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Company B has 0 trips, 0 spending, 0 pending expenses
    assert.equal(data.kpis.active_trips_count, 0);
    assert.equal(data.kpis.total_trips_count, 0);
    assert.equal(data.kpis.pending_expenses_count, 0);
    assert.equal(data.kpis.total_spending, 0);
    assert.equal(data.kpis.remaining_budget, 0);
    assert.equal(data.active_trips.length, 0);
    assert.equal(data.active_trip_map.length, 0);
    assert.equal(data.recent_activities.length, 0);
  });
});
