import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import supertest from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../app.js';
import { initializeSocket, getIO } from '../services/socket.service.js';
import { sequelize, User, Company, Trip, TripLocation } from '../model/index.js';
import { ROLES, TRIP_STATUS } from '../config/constants.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('PHASE 6: Realtime GPS Tracking Comprehensive Test Suite', () => {
  let server;
  let serverUrl;
  let request;

  let companyA, ownerA, tokenOwnerA;
  let managerA, tokenManagerA;
  let officerA1, tokenOfficerA1;
  let companyB, tokenOwnerB;

  let activeTripId;

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
        name: 'Pak Budi Owner',
        email: `owner_${Date.now()}@gpstrack.com`,
        password: 'Password123!',
        company_name: 'PT Logistik GPS Handal'
      })
      .expect(201);

    companyA = regA.body.data.company;
    ownerA = regA.body.data.user;
    tokenOwnerA = regA.body.data.tokens.access_token;

    // 3. Register Company B for Tenant Isolation
    const regB = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Pak Joko Owner B',
        email: `owner_${Date.now()}@othergps.com`,
        password: 'Password123!',
        company_name: 'PT Tenant Lain GPS'
      })
      .expect(201);

    companyB = regB.body.data.company;
    tokenOwnerB = regB.body.data.tokens.access_token;

    // 4. Add Manager to Company A
    const addMgrRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Ibu Maya Manager',
        email: `maya_${Date.now()}@gpstrack.com`,
        password: 'Password123!',
        role: ROLES.MANAGER
      })
      .expect(201);

    const loginMgr = await request
      .post('/api/v1/auth/login')
      .send({ email: addMgrRes.body.data.email, password: 'Password123!' })
      .expect(200);

    managerA = loginMgr.body.data.user;
    tokenManagerA = loginMgr.body.data.tokens.access_token;

    // 5. Add Officer to Company A
    const addOffRes = await request
      .post('/api/v1/company/members')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Doni Driver Officer',
        email: `doni_${Date.now()}@gpstrack.com`,
        password: 'Password123!',
        role: ROLES.OFFICER
      })
      .expect(201);

    const loginOff = await request
      .post('/api/v1/auth/login')
      .send({ email: addOffRes.body.data.email, password: 'Password123!' })
      .expect(200);

    officerA1 = loginOff.body.data.user;
    tokenOfficerA1 = loginOff.body.data.tokens.access_token;

    // 6. Create & Start Active Trip
    const createTripRes = await request
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .send({
        title: 'Ekspedisi Logistik Jakarta-Bandung',
        description: 'Pengantaran kargo suku cadang otomotif',
        start_location: 'Gudang Cakung Jakarta',
        destination: 'Gudang Soekarno Hatta Bandung',
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 86400000 * 2).toISOString(),
        initial_balance: 1500000,
        status: TRIP_STATUS.SCHEDULED,
        officer_ids: [officerA1.id]
      })
      .expect(201);

    activeTripId = createTripRes.body.data.id;

    // Start Trip -> ACTIVE
    await request
      .patch(`/api/v1/trips/${activeTripId}/status`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({ status: TRIP_STATUS.ACTIVE })
      .expect(200);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await sequelize.close();
  });

  // ==========================================
  // 1. SOCKET AUTHENTICATION
  // ==========================================
  test('1. Socket Auth: Valid token connects successfully; missing token fails', async () => {
    // 1a. Valid Connection
    const clientSocket = Client(serverUrl, {
      auth: { token: tokenOfficerA1 },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      clientSocket.on('connect', () => {
        assert.ok(clientSocket.connected);
        clientSocket.disconnect();
        resolve();
      });
      clientSocket.on('connect_error', (err) => reject(err));
    });

    // 1b. Connection without token fails
    const unauthSocket = Client(serverUrl, {
      transports: ['websocket']
    });

    await new Promise((resolve) => {
      unauthSocket.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication token required'));
        unauthSocket.disconnect();
        resolve();
      });
    });
  });

  // ==========================================
  // 2. SOCKET ROOM MANAGEMENT (trip:join & trip:leave)
  // ==========================================
  test('2. Socket Room Management: trip:join and trip:leave events', async () => {
    const socket = Client(serverUrl, {
      auth: { token: tokenManagerA },
      transports: ['websocket']
    });

    await new Promise((resolve) => socket.on('connect', resolve));

    // Test trip:join
    const joinPromise = new Promise((resolve) => {
      socket.on('trip:joined', (data) => {
        assert.strictEqual(data.trip_id, activeTripId);
        assert.strictEqual(data.user_id, managerA.id);
        resolve();
      });
    });
    socket.emit('trip:join', { trip_id: activeTripId });
    await joinPromise;

    // Test trip:leave
    const leavePromise = new Promise((resolve) => {
      socket.on('trip:left', (data) => {
        assert.strictEqual(data.trip_id, activeTripId);
        assert.strictEqual(data.user_id, managerA.id);
        resolve();
      });
    });
    socket.emit('trip:leave', { trip_id: activeTripId });
    await leavePromise;

    socket.disconnect();
  });

  // ==========================================
  // 3. REALTIME GPS STREAMING OVER SOCKET (location:update) & DB PERSISTENCE
  // ==========================================
  test('3. Socket GPS Streaming: Officer emits location:update and coordinate is saved to database', async () => {
    const officerSocket = Client(serverUrl, {
      auth: { token: tokenOfficerA1 },
      transports: ['websocket']
    });

    await new Promise((resolve) => officerSocket.on('connect', resolve));

    const gpsData = {
      trip_id: activeTripId,
      latitude: -6.20880000,
      longitude: 106.84560000,
      speed: 55.4,
      heading: 120.5,
      accuracy: 4.2,
      battery_level: 88.0,
      recorded_at: new Date().toISOString()
    };

    const ackPromise = new Promise((resolve) => {
      officerSocket.emit('location:update', gpsData, (res) => {
        assert.strictEqual(res.success, true);
        assert.ok(res.data.id);
        resolve(res.data);
      });
    });

    const savedPoint = await ackPromise;
    officerSocket.disconnect();

    // Verify DB persistence
    const dbRecord = await TripLocation.findByPk(savedPoint.id);
    assert.ok(dbRecord);
    assert.strictEqual(parseFloat(dbRecord.latitude), -6.20880000);
    assert.strictEqual(parseFloat(dbRecord.longitude), 106.84560000);
    assert.strictEqual(parseFloat(dbRecord.speed), 55.4);
    assert.strictEqual(parseFloat(dbRecord.heading), 120.5);
    assert.strictEqual(dbRecord.officer_id, officerA1.id);
  });

  // ==========================================
  // 4. REALTIME BROADCAST TO SUBSCRIBED MONITORING SOCKET
  // ==========================================
  test('4. Socket Broadcast: Subscribed manager receives live location:update broadcast', async () => {
    const managerSocket = Client(serverUrl, {
      auth: { token: tokenManagerA },
      transports: ['websocket']
    });
    const officerSocket = Client(serverUrl, {
      auth: { token: tokenOfficerA1 },
      transports: ['websocket']
    });

    await Promise.all([
      new Promise((resolve) => managerSocket.on('connect', resolve)),
      new Promise((resolve) => officerSocket.on('connect', resolve))
    ]);

    // Manager joins trip room
    managerSocket.emit('trip:join', { trip_id: activeTripId });
    await new Promise((resolve) => managerSocket.once('trip:joined', resolve));

    // Setup listener on manager
    const receivePromise = new Promise((resolve) => {
      managerSocket.on('location:update', (payload) => {
        assert.strictEqual(payload.trip_id, activeTripId);
        assert.strictEqual(payload.user_id, officerA1.id);
        assert.strictEqual(payload.officer.name, officerA1.name);
        assert.strictEqual(parseFloat(payload.location.latitude), -6.22000000);
        resolve();
      });
    });

    // Officer emits new position
    officerSocket.emit('location:update', {
      trip_id: activeTripId,
      latitude: -6.22000000,
      longitude: 106.85000000,
      speed: 60.0,
      heading: 95.0,
      accuracy: 3.5
    });

    await receivePromise;

    managerSocket.disconnect();
    officerSocket.disconnect();
  });

  // ==========================================
  // 5. TENANT ISOLATION IN SOCKET STREAMING
  // ==========================================
  test('5. Tenant Isolation: Company B socket cannot emit GPS for Company A trip', async () => {
    const rogueSocket = Client(serverUrl, {
      auth: { token: tokenOwnerB },
      transports: ['websocket']
    });

    await new Promise((resolve) => rogueSocket.on('connect', resolve));

    const errorPromise = new Promise((resolve) => {
      rogueSocket.on('error', (err) => {
        assert.ok(err.message.includes('unauthorized') || err.message.includes('not found'));
        resolve();
      });
    });

    rogueSocket.emit('location:update', {
      trip_id: activeTripId, // Company A trip
      latitude: -6.5000,
      longitude: 106.9000
    });

    await errorPromise;
    rogueSocket.disconnect();
  });

  // ==========================================
  // 6. REST API: SINGLE LOCATION LOG
  // ==========================================
  test('6. POST /api/v1/locations - Officer logs single location via REST API', async () => {
    const res = await request
      .post('/api/v1/locations')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: activeTripId,
        latitude: -6.30000000,
        longitude: 106.90000000,
        speed: 70.2,
        heading: 100.0,
        accuracy: 4.0,
        battery_level: 82.0,
        recorded_at: new Date().toISOString()
      })
      .expect(201);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(parseFloat(res.body.data.latitude), -6.30000000);
    assert.strictEqual(parseFloat(res.body.data.speed), 70.2);
    assert.strictEqual(parseFloat(res.body.data.heading), 100.0);
  });

  // ==========================================
  // 7. REST API: BATCH OFFLINE SYNC
  // ==========================================
  test('7. POST /api/v1/locations/batch - Officer uploads buffered offline GPS batch', async () => {
    const batchPoints = [
      {
        latitude: -6.40000000,
        longitude: 107.00000000,
        speed: 75.0,
        heading: 105.0,
        accuracy: 3.8,
        recorded_at: new Date(Date.now() - 30000).toISOString()
      },
      {
        latitude: -6.50000000,
        longitude: 107.10000000,
        speed: 80.0,
        heading: 110.0,
        accuracy: 3.5,
        recorded_at: new Date(Date.now() - 15000).toISOString()
      },
      {
        latitude: -6.60000000,
        longitude: 107.20000000,
        speed: 82.5,
        heading: 115.0,
        accuracy: 3.2,
        recorded_at: new Date().toISOString()
      }
    ];

    const res = await request
      .post('/api/v1/locations/batch')
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({
        trip_id: activeTripId,
        locations: batchPoints
      })
      .expect(201);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.length, 3);
  });

  // ==========================================
  // 8. REST API: ROUTE HISTORY QUERY
  // ==========================================
  test('8. GET /api/v1/locations/trip/:tripId - Manager retrieves route history', async () => {
    const res = await request
      .get(`/api/v1/locations/trip/${activeTripId}`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.trip);
    assert.strictEqual(res.body.data.trip.id, activeTripId);
    assert.ok(Array.isArray(res.body.data.locations));
    assert.ok(res.body.data.locations.length >= 5, 'Should have at least 5 logged points');

    // Check chronological order
    for (let i = 1; i < res.body.data.locations.length; i++) {
      const prev = new Date(res.body.data.locations[i - 1].recorded_at).getTime();
      const curr = new Date(res.body.data.locations[i].recorded_at).getTime();
      assert.ok(curr >= prev, 'Locations must be sorted in ascending chronological order');
    }
  });

  // ==========================================
  // 9. REST API: LATEST POSITION & ANALYTICS
  // ==========================================
  test('9. GET /api/v1/locations/trip/:tripId/latest & /stats - Computes distance & speeds', async () => {
    // 9a. Latest Position
    const latestRes = await request
      .get(`/api/v1/locations/trip/${activeTripId}/latest`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(latestRes.body.success, true);
    assert.ok(latestRes.body.data);
    assert.strictEqual(parseFloat(latestRes.body.data.latitude), -6.60000000);
    assert.strictEqual(parseFloat(latestRes.body.data.speed), 82.5);

    // 9b. Stats & Distance Calculation
    const statsRes = await request
      .get(`/api/v1/locations/trip/${activeTripId}/stats`)
      .set('Authorization', `Bearer ${tokenManagerA}`)
      .expect(200);

    assert.strictEqual(statsRes.body.success, true);
    assert.strictEqual(statsRes.body.data.trip_id, activeTripId);
    assert.ok(statsRes.body.data.total_distance_km > 0, 'Total distance must be calculated > 0 km');
    assert.ok(statsRes.body.data.avg_speed_kmh > 0, 'Average speed must be > 0');
    assert.strictEqual(statsRes.body.data.max_speed_kmh, 82.5);
    assert.ok(statsRes.body.data.points_count >= 5);

    // 9c. Tenant Isolation: Company B queries Company A stats -> 404
    await request
      .get(`/api/v1/locations/trip/${activeTripId}/stats`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .expect(404);
  });

  // ==========================================
  // 10. REALTIME TRIP STATUS BROADCAST (trip:status)
  // ==========================================
  test('10. Socket Trip Status: Completing a trip broadcasts trip:status to connected clients', async () => {
    const clientSocket = Client(serverUrl, {
      auth: { token: tokenOfficerA1 },
      transports: ['websocket']
    });

    await new Promise((resolve) => clientSocket.on('connect', resolve));
    clientSocket.emit('trip:join', { trip_id: activeTripId });
    await new Promise((resolve) => clientSocket.once('trip:joined', resolve));

    const statusBroadcastPromise = new Promise((resolve) => {
      clientSocket.on('trip:status', (payload) => {
        if (payload.trip_id === activeTripId && payload.status === TRIP_STATUS.COMPLETED) {
          resolve();
        }
      });
    });

    // Complete trip via REST
    await request
      .patch(`/api/v1/trips/${activeTripId}/status`)
      .set('Authorization', `Bearer ${tokenOfficerA1}`)
      .send({ status: TRIP_STATUS.COMPLETED })
      .expect(200);

    await statusBroadcastPromise;
    clientSocket.disconnect();
  });
});
