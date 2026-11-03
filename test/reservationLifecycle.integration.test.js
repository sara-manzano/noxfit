const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, mock, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'noxfit-test-secret';
process.env.REMINDERS_ENABLED = 'false';

const app = require('../src/app');
const mailer = require('../src/config/mailer');
const { hashPassword } = require('../src/config/auth');
const { getReservationWindow } = require('../src/services/reservationTime');
const { sendDueReminders } = require('../src/jobs/reminders');
const Member = require('../src/models/members');
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');
const Waitlist = require('../src/models/waitlist');

const PASSWORD = 'Noxfit123';

let mongoServer;
let emails;
let fixtures;

const futureDate = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const MEMBERSHIP_TYPES = ['Básica', 'Premium', 'VIP'];
let memberCounter = 0;

const createMember = async (id) => Member.create({
  member_id: id,
  full_name: `Member ${id}`,
  email: `${id}@noxfit.test`,
  password_hash: await hashPassword(PASSWORD),
  membership_type: MEMBERSHIP_TYPES[memberCounter++ % MEMBERSHIP_TYPES.length],
  subscription_status: 'active',
  subscription_current_period_end: new Date('2030-01-01T00:00:00.000Z'),
});

const createTrainer = async (id, overrides = {}) => Trainer.create({
  trainer_id: id,
  full_name: `Trainer ${id}`,
  email: `${id}@noxfit.test`,
  password_hash: await hashPassword(PASSWORD),
  activity_type: 'CrossFit',
  is_admin: false,
  ...overrides,
});

const createReservation = (overrides) => Reservation.create({
  reservation_id: `res-${Math.random().toString(36).slice(2, 10)}`,
  activity_type: 'CrossFit',
  date: futureDate(7),
  time_slot: '10:00 - 11:00',
  status: 'Confirmada',
  ...overrides,
});

const login = async (role, email) => {
  const response = await request(app).post('/api/auth/login').send({ role, email, password: PASSWORD });
  return `Bearer ${response.body.token}`;
};

const madridNowParts = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));

  return { ...parts, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};

const pad = (value) => String(value).padStart(2, '0');
const formatMinutes = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([
    Member.syncIndexes(),
    Trainer.syncIndexes(),
    Reservation.syncIndexes(),
    Waitlist.syncIndexes(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    Reservation.deleteMany({}),
    Waitlist.deleteMany({}),
    Member.deleteMany({}),
    Trainer.deleteMany({}),
  ]);

  emails = [];
  mock.method(mailer, 'sendReservationEmail', async (to, kind) => {
    emails.push({ to, kind });
  });

  fixtures = {
    memberA: await createMember('member-a'),
    memberB: await createMember('member-b'),
    trainer: await createTrainer('trainer-one', { center: 'Noxfit Salamanca' }),
    admin: await createTrainer('trainer-admin', { is_admin: true }),
  };
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

test('getReservationWindow converts Madrid wall-clock time across DST', () => {
  const summer = getReservationWindow({ date: new Date('2026-07-15T00:00:00.000Z'), time_slot: '10:00 - 11:00' });
  const winter = getReservationWindow({ date: new Date('2026-01-15T00:00:00.000Z'), time_slot: '10:00 - 11:00' });

  assert.equal(summer.start.toISOString(), '2026-07-15T08:00:00.000Z');
  assert.equal(summer.end.toISOString(), '2026-07-15T09:00:00.000Z');
  assert.equal(winter.start.toISOString(), '2026-01-15T09:00:00.000Z');
});

test('member cancels a future reservation and gets notified', async () => {
  await createReservation({ reservation_id: 'res-1', member: fixtures.memberA._id, trainer: fixtures.trainer._id });
  const token = await login('member', 'member-a@noxfit.test');

  const response = await request(app).post('/api/reservations/res-1/cancel').set('Authorization', token);

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Cancelada');
  assert.equal(response.body.cancelled_by, 'member');
  assert.ok(response.body.cancelled_at);
  assert.deepEqual(emails, [{ to: 'member-a@noxfit.test', kind: 'cancellation' }]);
});

test('member cannot cancel, reschedule or delete inside the change window', async () => {
  await createReservation({
    reservation_id: 'res-soon',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    date: futureDate(-1),
  });
  const token = await login('member', 'member-a@noxfit.test');

  const cancel = await request(app).post('/api/reservations/res-soon/cancel').set('Authorization', token);
  const reschedule = await request(app)
    .post('/api/reservations/res-soon/reschedule')
    .set('Authorization', token)
    .send({ time_slot: '12:00 - 13:00' });
  const patch = await request(app)
    .patch('/api/reservations/res-soon')
    .set('Authorization', token)
    .send({ status: 'Cancelada' });
  const remove = await request(app).delete('/api/reservations/res-soon').set('Authorization', token);

  assert.deepEqual([cancel.status, reschedule.status, patch.status, remove.status], [409, 409, 409, 409]);
});

test('a trainer can cancel inside the window but another member cannot cancel it', async () => {
  await createReservation({
    reservation_id: 'res-owned',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    date: futureDate(-1),
  });
  await createReservation({
    reservation_id: 'res-other',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    date: futureDate(9),
  });
  const trainerToken = await login('trainer', 'trainer-one@noxfit.test');
  const otherMemberToken = await login('member', 'member-b@noxfit.test');

  const byTrainer = await request(app).post('/api/reservations/res-owned/cancel').set('Authorization', trainerToken);
  const byOtherMember = await request(app).post('/api/reservations/res-other/cancel').set('Authorization', otherMemberToken);

  assert.equal(byTrainer.status, 200);
  assert.equal(byTrainer.body.cancelled_by, 'trainer');
  assert.equal(byOtherMember.status, 403);
});

test('member cannot book or move a reservation into the past', async () => {
  await createReservation({ reservation_id: 'res-keep', member: fixtures.memberA._id, trainer: fixtures.trainer._id });
  const token = await login('member', 'member-a@noxfit.test');

  const book = await request(app)
    .post('/api/reservations')
    .set('Authorization', token)
    .send({ trainer_id: 'trainer-one', activity_type: 'CrossFit', date: futureDate(-1).toISOString(), time_slot: '10:00 - 11:00' });
  const move = await request(app)
    .post('/api/reservations/res-keep/reschedule')
    .set('Authorization', token)
    .send({ date: futureDate(-1).toISOString() });

  assert.equal(book.status, 400);
  assert.equal(move.status, 409);
});

test('member cannot delete a completed reservation but a trainer admin can', async () => {
  await createReservation({
    reservation_id: 'res-done',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    status: 'Completada',
  });
  const memberToken = await login('member', 'member-a@noxfit.test');
  const adminToken = await login('trainer', 'trainer-admin@noxfit.test');

  const byMember = await request(app).delete('/api/reservations/res-done').set('Authorization', memberToken);
  const byAdmin = await request(app).delete('/api/reservations/res-done').set('Authorization', adminToken);

  assert.equal(byMember.status, 403);
  assert.equal(byAdmin.status, 204);
});

test('member reschedules a confirmed reservation to a free slot', async () => {
  await createReservation({ reservation_id: 'res-move', member: fixtures.memberA._id, trainer: fixtures.trainer._id });
  const token = await login('member', 'member-a@noxfit.test');

  const response = await request(app)
    .post('/api/reservations/res-move/reschedule')
    .set('Authorization', token)
    .send({ time_slot: '12:00 - 13:00' });
  const invalid = await request(app)
    .post('/api/reservations/res-move/reschedule')
    .set('Authorization', token)
    .send({});

  assert.equal(response.status, 200);
  assert.equal(response.body.time_slot, '12:00 - 13:00');
  assert.deepEqual(emails, [{ to: 'member-a@noxfit.test', kind: 'rescheduled' }]);
  assert.equal(invalid.status, 400);
});

test('waiting list: join only when full, then promote on cancellation', async () => {
  const date = futureDate(10);
  await createReservation({
    reservation_id: 'res-personal',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    activity_type: 'Entrenamiento personal',
    date,
  });
  const tokenB = await login('member', 'member-b@noxfit.test');
  const tokenA = await login('member', 'member-a@noxfit.test');
  const slot = { trainer_id: 'trainer-one', activity_type: 'CrossFit', date: date.toISOString(), time_slot: '10:00 - 11:00' };

  const free = await request(app)
    .post('/api/waitlist')
    .set('Authorization', tokenB)
    .send({ ...slot, time_slot: '12:00 - 13:00' });
  const joined = await request(app).post('/api/waitlist').set('Authorization', tokenB).send(slot);
  const duplicate = await request(app).post('/api/waitlist').set('Authorization', tokenB).send(slot);
  const listed = await request(app).get('/api/waitlist').set('Authorization', tokenB);

  assert.equal(free.status, 409);
  assert.equal(joined.status, 201);
  assert.equal(joined.body.position, 1);
  assert.equal(duplicate.status, 409);
  assert.equal(listed.body.total, 1);

  const cancel = await request(app).post('/api/reservations/res-personal/cancel').set('Authorization', tokenA);
  const promoted = await Reservation.findOne({ member: fixtures.memberB._id, status: 'Confirmada' }).lean();
  const entry = await Waitlist.findOne({ waitlist_id: joined.body.waitlist_id }).lean();

  assert.equal(cancel.status, 200);
  assert.ok(promoted);
  assert.equal(promoted.time_slot, '10:00 - 11:00');
  assert.equal(entry.status, 'Promovida');
  assert.equal(entry.reservation_id, promoted.reservation_id);
  assert.ok(emails.some((email) => email.to === 'member-b@noxfit.test' && email.kind === 'waitlist_promoted'));
});

test('member can leave the waiting list but not someone else\'s entry', async () => {
  const date = futureDate(10);
  await createReservation({
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    activity_type: 'Entrenamiento personal',
    date,
  });
  const tokenA = await login('member', 'member-a@noxfit.test');
  const tokenB = await login('member', 'member-b@noxfit.test');
  const joined = await request(app).post('/api/waitlist').set('Authorization', tokenB).send({
    trainer_id: 'trainer-one',
    activity_type: 'CrossFit',
    date: date.toISOString(),
    time_slot: '10:00 - 11:00',
  });

  const foreign = await request(app).delete(`/api/waitlist/${joined.body.waitlist_id}`).set('Authorization', tokenA);
  const own = await request(app).delete(`/api/waitlist/${joined.body.waitlist_id}`).set('Authorization', tokenB);

  assert.equal(foreign.status, 403);
  assert.equal(own.status, 204);
  assert.equal(await Waitlist.countDocuments({}), 0);
});

test('check-in: member gets a code and the trainer validates it inside the session window', async (t) => {
  const now = madridNowParts();

  if (now.minutes < 30 || now.minutes > 22 * 60) {
    t.skip('Madrid time of day is too close to midnight to build a slot around now');
    return;
  }

  const timeSlot = `${formatMinutes(now.minutes - 10)} - ${formatMinutes(now.minutes + 50)}`;
  await createReservation({
    reservation_id: 'res-now',
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    date: new Date(Date.UTC(Number(now.year), Number(now.month) - 1, Number(now.day))),
    time_slot: timeSlot,
  });
  const memberToken = await login('member', 'member-a@noxfit.test');
  const trainerToken = await login('trainer', 'trainer-one@noxfit.test');
  const otherTrainerToken = await login('trainer', 'trainer-admin@noxfit.test');

  const codeResponse = await request(app).get('/api/reservations/res-now/checkin-code').set('Authorization', memberToken);
  const sameCode = await request(app).get('/api/reservations/res-now/checkin-code').set('Authorization', memberToken);
  const forbidden = await request(app).get('/api/reservations/res-now/checkin-code').set('Authorization', trainerToken);
  const memberCheckin = await request(app).post('/api/reservations/checkin').set('Authorization', memberToken).send({ code: codeResponse.body.code });
  const badCode = await request(app).post('/api/reservations/checkin').set('Authorization', trainerToken).send({ code: 'nope' });
  const checkin = await request(app).post('/api/reservations/checkin').set('Authorization', trainerToken).send({ code: codeResponse.body.code });
  const again = await request(app).post('/api/reservations/checkin').set('Authorization', otherTrainerToken).send({ code: codeResponse.body.code });

  assert.equal(codeResponse.status, 200);
  assert.match(codeResponse.body.code, /^[0-9a-f]{32}$/);
  assert.equal(sameCode.body.code, codeResponse.body.code);
  assert.equal(forbidden.status, 403);
  assert.equal(memberCheckin.status, 403);
  assert.equal(badCode.status, 404);
  assert.equal(checkin.status, 200);
  assert.equal(checkin.body.status, 'Completed');
  assert.ok(checkin.body.checked_in_at);
  assert.equal(checkin.body.checkin_code, undefined);
  assert.equal(again.status, 409);
});

test('check-in is rejected outside the session window and for other trainers', async () => {
  await createReservation({ reservation_id: 'res-later', member: fixtures.memberA._id, trainer: fixtures.trainer._id });
  const other = await createTrainer('trainer-two');
  const memberToken = await login('member', 'member-a@noxfit.test');
  const trainerToken = await login('trainer', 'trainer-one@noxfit.test');
  const otherToken = await login('trainer', `${other.trainer_id}@noxfit.test`);
  const { body } = await request(app).get('/api/reservations/res-later/checkin-code').set('Authorization', memberToken);

  const early = await request(app).post('/api/reservations/checkin').set('Authorization', trainerToken).send({ code: body.code });
  const foreign = await request(app).post('/api/reservations/checkin').set('Authorization', otherToken).send({ code: body.code });

  assert.equal(early.status, 409);
  assert.equal(foreign.status, 403);
});

test('reminder job emails reservations starting within 24 hours exactly once', async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const madrid = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(soon).map((part) => [part.type, part.value]));
  const startMinutes = Number(madrid.hour) * 60 + Number(madrid.minute);

  if (startMinutes > 22 * 60) {
    return;
  }

  await createReservation({
    member: fixtures.memberA._id,
    trainer: fixtures.trainer._id,
    date: new Date(Date.UTC(Number(madrid.year), Number(madrid.month) - 1, Number(madrid.day))),
    time_slot: `${formatMinutes(startMinutes)} - ${formatMinutes(startMinutes + 60)}`,
  });
  await createReservation({ member: fixtures.memberB._id, trainer: fixtures.trainer._id, date: futureDate(20) });

  const first = await sendDueReminders(now);
  const second = await sendDueReminders(now);

  assert.equal(first, 1);
  assert.equal(second, 0);
  assert.deepEqual(emails, [{ to: 'member-a@noxfit.test', kind: 'reminder' }]);
});

test('creating a reservation as a member sends a confirmation email', async () => {
  const token = await login('member', 'member-a@noxfit.test');

  const response = await request(app).post('/api/reservations').set('Authorization', token).send({
    trainer_id: 'trainer-one',
    activity_type: 'CrossFit',
    center: 'Noxfit Salamanca',
    date: futureDate(5).toISOString(),
    time_slot: '09:00 - 10:00',
  });

  assert.equal(response.status, 201);
  assert.deepEqual(emails, [{ to: 'member-a@noxfit.test', kind: 'confirmation' }]);
});
