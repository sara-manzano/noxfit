const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'noxfit-test-secret';
process.env.TRAINER_BOOTSTRAP_TOKEN = process.env.TRAINER_BOOTSTRAP_TOKEN || 'bootstrap-secret';

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
  .post('/api/auth/login')
  .send({ role: 'member', email, password: PASSWORD });

const loginTrainer = (email) => request(app)
  .post('/api/auth/login')
  .send({ role: 'trainer', email, password: PASSWORD });

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

test('member login works through the unified auth route', async () => {
  await createFixtures();

  const response = await request(app)
    .post('/api/auth/login')
    .send({
      role: 'member',
      email: 'member-a@noxfit.test',
      password: PASSWORD,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.member_id, 'member-a');
});

test('trainer login with a record missing password hash returns 401 instead of 500', async () => {
  await Trainer.collection.insertOne({
    trainer_id: 'trainer-no-hash',
    full_name: 'Trainer No Hash',
    email: 'trainer-no-hash@noxfit.test',
    activity_type: 'CrossFit',
    active: true,
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({
      role: 'trainer',
      email: 'trainer-no-hash@noxfit.test',
      password: PASSWORD,
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Invalid email or password');
});

test('public member registration route no longer exists', async () => {
  const response = await request(app)
    .post('/api/members/register')
    .send({
      member_id: 'member-public',
      full_name: 'Member Public',
      email: 'member-public@noxfit.test',
      password: PASSWORD,
      membership_type: 'Premium',
    });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Resource was not found');
});

test('trainer admin lists all reservations while a standard trainer only sees their own', async () => {
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
  assert.equal(standardResponse.status, 200);
  assert.equal(standardResponse.body.total, 1);
  assert.equal(standardResponse.body.items[0].reservation_id, 'reservation-b');
});

test('standard trainer creates reservations as themselves and cannot book for another trainer', async () => {
  await createFixtures();

  const standardLogin = await loginTrainer('trainer-standard@noxfit.test');
  const token = standardLogin.body.token;

  const created = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      reservation_id: 'reservation-by-trainer',
      member_id: 'member-a',
      date: '2026-12-01',
      time_slot: '10:00 - 11:00',
    });

  assert.equal(created.status, 201);
  assert.equal(created.body.trainer.trainer_id, 'trainer-standard');
  assert.equal(created.body.member.member_id, 'member-a');
  assert.equal(created.body.booked_by, 'trainer');

  const memberLogin = await loginMember('member-b@noxfit.test');
  const byMember = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${memberLogin.body.token}`)
    .send({
      reservation_id: 'reservation-by-member',
      trainer_id: 'trainer-standard',
      booked_by: 'trainer',
      date: '2026-12-03',
      time_slot: '10:00 - 11:00',
    });

  assert.equal(byMember.status, 201);
  assert.equal(byMember.body.booked_by, 'member');

  const forbidden = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      reservation_id: 'reservation-other-trainer',
      member_id: 'member-a',
      trainer_id: 'trainer-admin',
      date: '2026-12-02',
      time_slot: '10:00 - 11:00',
    });

  assert.equal(forbidden.status, 403);
});

test('trainer bookings require a member and show up in that member\'s reservations', async () => {
  await createFixtures();

  const standardLogin = await loginTrainer('trainer-standard@noxfit.test');
  const adminLogin = await loginTrainer('trainer-admin@noxfit.test');
  const memberLogin = await loginMember('member-a@noxfit.test');

  const missingMember = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${standardLogin.body.token}`)
    .send({ activity_type: 'Pilates', date: '2026-12-05', time_slot: '10:00 - 11:00' });

  assert.equal(missingMember.status, 400);

  const own = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${standardLogin.body.token}`)
    .send({ member_id: 'member-a', activity_type: 'Pilates', date: '2026-12-05', time_slot: '10:00 - 11:00' });

  assert.equal(own.status, 201);
  assert.match(own.body.reservation_id, /^R-/);
  assert.equal(own.body.booked_by, 'trainer');
  assert.equal(own.body.trainer.trainer_id, 'trainer-standard');
  assert.equal(own.body.member.member_id, 'member-a');

  const memberReservations = await request(app)
    .get('/api/reservations')
    .set('Authorization', `Bearer ${memberLogin.body.token}`);

  assert.ok(memberReservations.body.items.some((item) => item.reservation_id === own.body.reservation_id));

  const adminBooking = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${adminLogin.body.token}`)
    .send({
      booked_by: 'trainer',
      member_id: 'member-b',
      trainer_id: 'trainer-admin',
      activity_type: 'CrossFit',
      date: '2026-12-05',
      time_slot: '10:00 - 11:00',
    });

  assert.equal(adminBooking.status, 201);

  const conflict = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${standardLogin.body.token}`)
    .send({ member_id: 'member-b', activity_type: 'Pilates', date: '2026-12-05', time_slot: '10:00 - 11:00' });

  assert.equal(conflict.status, 409);
});

test('standard trainers cannot modify reservations or their own profile', async () => {
  await createFixtures();

  const standardToken = (await loginTrainer('trainer-standard@noxfit.test')).body.token;

  const patchReservation = await request(app)
    .patch('/api/reservations/reservation-b')
    .set('Authorization', `Bearer ${standardToken}`)
    .send({ status: 'Cancelada' });
  const deleteReservation = await request(app)
    .delete('/api/reservations/reservation-b')
    .set('Authorization', `Bearer ${standardToken}`);
  const patchProfile = await request(app)
    .patch('/api/trainers/me')
    .set('Authorization', `Bearer ${standardToken}`)
    .send({ full_name: 'Changed' });
  const deleteMember = await request(app)
    .delete('/api/members/member-a')
    .set('Authorization', `Bearer ${standardToken}`);

  assert.equal(patchReservation.status, 403);
  assert.equal(deleteReservation.status, 403);
  assert.equal(patchProfile.status, 403);
  assert.equal(deleteMember.status, 403);
});

test('directories expose minimal fields to the counterpart role', async () => {
  await createFixtures();

  const memberLogin = await loginMember('member-a@noxfit.test');
  const trainerLogin = await loginTrainer('trainer-standard@noxfit.test');

  const trainers = await request(app)
    .get('/api/trainers/directory')
    .set('Authorization', `Bearer ${memberLogin.body.token}`);
  const members = await request(app)
    .get('/api/members/directory')
    .set('Authorization', `Bearer ${trainerLogin.body.token}`);
  const membersAsMember = await request(app)
    .get('/api/members/directory')
    .set('Authorization', `Bearer ${memberLogin.body.token}`);

  assert.equal(trainers.status, 200);
  assert.equal(trainers.body.total, 2);
  assert.equal(trainers.body.items[0].email, undefined);
  assert.equal(members.status, 200);
  assert.equal(members.body.total, 2);
  assert.equal(members.body.items[0].email, undefined);
  assert.equal(membersAsMember.status, 403);
});

test('public trainer registration bootstraps the first admin and then closes', async () => {
  const firstResponse = await request(app)
    .post('/api/trainers/register')
    .set('x-bootstrap-token', process.env.TRAINER_BOOTSTRAP_TOKEN)
    .send({
      trainer_id: 'trainer-bootstrap',
      full_name: 'Trainer Bootstrap',
      email: 'trainer-bootstrap@noxfit.test',
      password: PASSWORD,
      activity_type: 'CrossFit',
    });

  const secondResponse = await request(app)
    .post('/api/trainers/register')
    .send({
      trainer_id: 'trainer-second',
      full_name: 'Trainer Second',
      email: 'trainer-second@noxfit.test',
      password: PASSWORD,
      activity_type: 'Pilates',
    });

  assert.equal(firstResponse.status, 201);
  assert.equal(firstResponse.body.user.is_admin, true);
  assert.equal(secondResponse.status, 403);
  assert.equal(secondResponse.body.error, 'Public trainer registration is closed; ask an admin to create the account');
});

test('public trainer bootstrap requires the configured bootstrap token', async () => {
  const response = await request(app)
    .post('/api/trainers/register')
    .send({
      trainer_id: 'trainer-bootstrap',
      full_name: 'Trainer Bootstrap',
      email: 'trainer-bootstrap@noxfit.test',
      password: PASSWORD,
      activity_type: 'CrossFit',
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'A valid bootstrap token is required to create the first trainer admin');
});

test('unknown api routes return a JSON 404 error', async () => {
  const response = await request(app).get('/api/unknown');

  assert.equal(response.status, 404);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.deepEqual(response.body, { error: 'Resource was not found' });
});

test('reservation dates are normalized before persistence', async () => {
  const reservation = await createReservation({
    member: new mongoose.Types.ObjectId(),
    trainer: new mongoose.Types.ObjectId(),
    date: new Date('2026-11-10T15:30:00.000Z'),
  });

  assert.equal(reservation.date.toISOString(), '2026-11-10T00:00:00.000Z');
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

test('member cannot change their own member_id through /me', async () => {
  await createFixtures();

  const memberLogin = await loginMember('member-a@noxfit.test');

  const response = await request(app)
    .patch('/api/members/me')
    .set('Authorization', `Bearer ${memberLogin.body.token}`)
    .send({
      member_id: 'member-a-updated',
      full_name: 'Member A Updated',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.member_id, 'member-a');
  assert.equal(response.body.full_name, 'Member A Updated');

  const persistedMember = await Member.findOne({ email: 'member-a@noxfit.test' }).lean();

  assert.equal(persistedMember.member_id, 'member-a');
});

test('trainer cannot change their own trainer_id through /me', async () => {
  await createFixtures();

  const trainerLogin = await loginTrainer('trainer-admin@noxfit.test');

  const response = await request(app)
    .patch('/api/trainers/me')
    .set('Authorization', `Bearer ${trainerLogin.body.token}`)
    .send({
      trainer_id: 'trainer-admin-updated',
      full_name: 'Trainer Admin Updated',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.trainer_id, 'trainer-admin');
  assert.equal(response.body.full_name, 'Trainer Admin Updated');

  const persistedTrainer = await Trainer.findOne({ email: 'trainer-admin@noxfit.test' }).lean();

  assert.equal(persistedTrainer.trainer_id, 'trainer-admin');
});

test('PUT member self-update is rejected with 405', async () => {
  await createFixtures();

  const memberLogin = await loginMember('member-a@noxfit.test');

  const response = await request(app)
    .put('/api/members/me')
    .set('Authorization', `Bearer ${memberLogin.body.token}`)
    .send({
      full_name: 'Member A Updated',
    });

  assert.equal(response.status, 405);
  assert.equal(response.body.error, 'PUT is not supported for members; use PATCH for partial updates');
});

test('PUT reservation update is rejected with 405', async () => {
  await createFixtures();

  const trainerLogin = await loginTrainer('trainer-admin@noxfit.test');

  const response = await request(app)
    .put('/api/reservations/reservation-a')
    .set('Authorization', `Bearer ${trainerLogin.body.token}`)
    .send({
      status: 'Completada',
    });

  assert.equal(response.status, 405);
  assert.equal(response.body.error, 'PUT is not supported for reservations; use PATCH for partial updates');
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