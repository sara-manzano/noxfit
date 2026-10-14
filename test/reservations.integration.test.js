const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'noxfit-test-secret';

const app = require('../src/app');
const { hashPassword } = require('../src/config/auth');
const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');

const PASSWORD = 'Noxfit123';

let mongoServer;

const createMember = async (overrides = {}) => {
  const password_hash = await hashPassword(PASSWORD);

  return Member.create({
    member_id: overrides.member_id || `member-${Math.random().toString(36).slice(2, 10)}`,
    full_name: overrides.full_name || 'Test Member',
    email: overrides.email || `member-${Math.random().toString(36).slice(2, 10)}@noxfit.test`,
    password_hash,
    membership_type: 'Premium',
    ...overrides,
  });
};

const createTrainer = async (overrides = {}) => {
  const password_hash = await hashPassword(PASSWORD);

  return Trainer.create({
    trainer_id: overrides.trainer_id || `trainer-${Math.random().toString(36).slice(2, 10)}`,
    full_name: overrides.full_name || 'Test Trainer',
    email: overrides.email || `trainer-${Math.random().toString(36).slice(2, 10)}@noxfit.test`,
    password_hash,
    activity_type: 'CrossFit',
    is_admin: false,
    ...overrides,
  });
};

const createReservation = (overrides = {}) => Reservation.create({
  reservation_id: overrides.reservation_id || `reservation-${Math.random().toString(36).slice(2, 10)}`,
  member: overrides.member,
  trainer: overrides.trainer,
  activity_type: overrides.activity_type || 'CrossFit',
  date: overrides.date || new Date('2026-11-10T00:00:00.000Z'),
  time_slot: overrides.time_slot || '10:00 - 11:00',
  status: overrides.status || 'Confirmada',
  price: overrides.price || 40,
});

const loginMember = (email) => request(app)
  .post('/api/members/login')
  .send({ email, password: PASSWORD });

const loginTrainer = (email) => request(app)
  .post('/api/trainers/login')
  .send({ email, password: PASSWORD });

const createFixtures = async () => {
  const memberA = await createMember({
    member_id: 'member-a',
    full_name: 'Member A',
    email: 'member-a@noxfit.test',
  });
  const memberB = await createMember({
    member_id: 'member-b',
    full_name: 'Member B',
    email: 'member-b@noxfit.test',
  });
  const trainerAdmin = await createTrainer({
    trainer_id: 'trainer-admin',
    full_name: 'Trainer Admin',
    email: 'trainer-admin@noxfit.test',
    is_admin: true,
  });
  const trainerStandard = await createTrainer({
    trainer_id: 'trainer-standard',
    full_name: 'Trainer Standard',
    email: 'trainer-standard@noxfit.test',
  });

  await createReservation({
    reservation_id: 'reservation-a',
    member: memberA._id,
    trainer: trainerAdmin._id,
    activity_type: 'CrossFit',
    date: new Date('2026-11-10T00:00:00.000Z'),
    time_slot: '10:00 - 11:00',
    status: 'Confirmada',
  });

  await createReservation({
    reservation_id: 'reservation-b',
    member: memberB._id,
    trainer: trainerStandard._id,
    activity_type: 'Pilates',
    date: new Date('2026-11-11T00:00:00.000Z'),
    time_slot: '12:00 - 13:00',
    status: 'Completada',
  });

  return {
    memberA,
    memberB,
    trainerAdmin,
    trainerStandard,
  };
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([
    Member.syncIndexes(),
    Trainer.syncIndexes(),
    Reservation.syncIndexes(),
  ]);
});

beforeEach(async () => {
  await Reservation.deleteMany({});
  await Member.deleteMany({});
  await Trainer.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('member login returns a token and sanitized user payload', async () => {
  await createFixtures();

  const response = await loginMember('member-a@noxfit.test');

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.member_id, 'member-a');
  assert.equal(response.body.user.email, 'member-a@noxfit.test');
  assert.equal(response.body.user.password_hash, undefined);
});

test('trainer admin can list all reservations while a non-admin trainer is rejected', async () => {
  await createFixtures();

  const adminLogin = await loginTrainer('trainer-admin@noxfit.test');
  const standardLogin = await loginTrainer('trainer-standard@noxfit.test');

  const adminResponse = await request(app)
    .get('/api/reservations')
    .set('Authorization', `Bearer ${adminLogin.body.token}`);

  const standardResponse = await request(app)
    .get('/api/reservations')
    .set('Authorization', `Bearer ${standardLogin.body.token}`);

  assert.equal(adminResponse.status, 200);
  assert.equal(adminResponse.body.total, 2);
  assert.equal(standardResponse.status, 403);
  assert.equal(standardResponse.body.error, 'Reservations require member or trainer admin access');
});

test('member only sees their own reservations and cannot query another member by id', async () => {
  await createFixtures();

  const memberLogin = await loginMember('member-a@noxfit.test');

  const ownReservations = await request(app)
    .get('/api/reservations')
    .set('Authorization', `Bearer ${memberLogin.body.token}`);

  const forbiddenQuery = await request(app)
    .get('/api/reservations')
    .query({ member_id: 'member-b' })
    .set('Authorization', `Bearer ${memberLogin.body.token}`);

  assert.equal(ownReservations.status, 200);
  assert.equal(ownReservations.body.total, 1);
  assert.equal(ownReservations.body.items[0].member.member_id, 'member-a');
  assert.equal(forbiddenQuery.status, 403);
  assert.equal(forbiddenQuery.body.error, 'You can only view your own reservations');
});

test('creating a reservation rejects trainer slot conflicts with 409', async () => {
  const { memberB } = await createFixtures();
  const adminLogin = await loginTrainer('trainer-admin@noxfit.test');

  const response = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      reservation_id: 'reservation-conflict-trainer',
      member_id: memberB.member_id,
      trainer_id: 'trainer-admin',
      activity_type: 'CrossFit',
      date: '2026-11-10',
      time_slot: '10:00 - 11:00',
      status: 'Confirmada',
      price: 50,
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Trainer is already booked for that time slot');
});

test('creating a reservation rejects member slot conflicts with 409', async () => {
  await createFixtures();
  const memberLogin = await loginMember('member-a@noxfit.test');

  const response = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${memberLogin.body.token}`)
    .send({
      reservation_id: 'reservation-conflict-member',
      trainer_id: 'trainer-standard',
      activity_type: 'Pilates',
      date: '2026-11-10',
      time_slot: '10:00 - 11:00',
      status: 'Confirmada',
      price: 50,
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Member already has a reservation for that time slot');
});

test('updating a reservation rejects moving it into an occupied trainer slot', async () => {
  const { memberA, memberB, trainerAdmin, trainerStandard } = await createFixtures();
  const adminLogin = await loginTrainer('trainer-admin@noxfit.test');

  await createReservation({
    reservation_id: 'reservation-move-target',
    member: memberB._id,
    trainer: trainerAdmin._id,
    activity_type: 'CrossFit',
    date: new Date('2026-11-12T00:00:00.000Z'),
    time_slot: '09:00 - 10:00',
    status: 'Confirmada',
  });

  await createReservation({
    reservation_id: 'reservation-move-source',
    member: memberA._id,
    trainer: trainerStandard._id,
    activity_type: 'Pilates',
    date: new Date('2026-11-13T00:00:00.000Z'),
    time_slot: '15:00 - 16:00',
    status: 'Confirmada',
  });

  const response = await request(app)
    .patch('/api/reservations/reservation-move-source')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      trainer_id: 'trainer-admin',
      date: '2026-11-12',
      time_slot: '09:00 - 10:00',
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Trainer is already booked for that time slot');
});

test('updating a reservation rejects moving it into an occupied member slot', async () => {
  const { memberA, memberB, trainerAdmin, trainerStandard } = await createFixtures();
  const adminLogin = await loginTrainer('trainer-admin@noxfit.test');

  await createReservation({
    reservation_id: 'reservation-member-target',
    member: memberA._id,
    trainer: trainerAdmin._id,
    activity_type: 'CrossFit',
    date: new Date('2026-11-14T00:00:00.000Z'),
    time_slot: '11:00 - 12:00',
    status: 'Confirmada',
  });

  await createReservation({
    reservation_id: 'reservation-member-source',
    member: memberB._id,
    trainer: trainerStandard._id,
    activity_type: 'Pilates',
    date: new Date('2026-11-15T00:00:00.000Z'),
    time_slot: '16:00 - 17:00',
    status: 'Confirmada',
  });

  const response = await request(app)
    .patch('/api/reservations/reservation-member-source')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      member_id: 'member-a',
      date: '2026-11-14',
      time_slot: '11:00 - 12:00',
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Member already has a reservation for that time slot');
});