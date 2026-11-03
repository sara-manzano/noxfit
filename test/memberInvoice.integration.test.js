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
let trainer;

const login = async (role, email) => {
  const response = await request(app).post('/api/auth/login').send({ role, email, password: PASSWORD });

  return `Bearer ${response.body.token}`;
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([Member.syncIndexes(), Reservation.syncIndexes()]);
});

beforeEach(async () => {
  await Promise.all([Member.deleteMany({}), Trainer.deleteMany({}), Reservation.deleteMany({})]);

  const password_hash = await hashPassword(PASSWORD);
  const member = await Member.create({
    member_id: 'member-sara',
    full_name: 'Sara <Manzano>',
    email: 'sara@noxfit.test',
    password_hash,
    membership_type: 'Premium',
  });

  trainer = await Trainer.create({
    trainer_id: 'trainer-admin',
    full_name: 'Admin',
    email: 'admin@noxfit.test',
    password_hash,
    activity_type: 'CrossFit',
    is_admin: true,
  });

  await Trainer.create({
    trainer_id: 'trainer-standard',
    full_name: 'Standard',
    email: 'standard@noxfit.test',
    password_hash,
    activity_type: 'Yoga',
    is_admin: false,
  });

  await Reservation.create([
    {
      reservation_id: 'r1', member: member._id, trainer: trainer._id, activity_type: 'CrossFit',
      date: new Date('2026-11-10T00:00:00.000Z'), time_slot: '10:00 - 11:00', status: 'Confirmada', price: 10,
    },
    {
      reservation_id: 'r2', member: member._id, trainer: trainer._id, activity_type: 'Yoga',
      date: new Date('2026-11-12T00:00:00.000Z'), time_slot: '10:00 - 11:00', status: 'Completada', price: 10, credit_used: true,
    },
    {
      reservation_id: 'r3', member: member._id, trainer: trainer._id, activity_type: 'Yoga',
      date: new Date('2026-11-14T00:00:00.000Z'), time_slot: '10:00 - 11:00', status: 'Cancelada', price: 10,
    },
    {
      reservation_id: 'r4', member: member._id, trainer: trainer._id, activity_type: 'Yoga',
      date: new Date('2026-12-01T00:00:00.000Z'), time_slot: '10:00 - 11:00', status: 'Confirmada', price: 10,
    },
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

test('invoice requires a trainer session', async () => {
  const anonymous = await request(app).get('/api/members/member-sara/invoice');
  const member = await request(app)
    .get('/api/members/member-sara/invoice')
    .set('Authorization', await login('member', 'sara@noxfit.test'));
  const standardTrainer = await request(app)
    .get('/api/members/member-sara/invoice')
    .set('Authorization', await login('trainer', 'standard@noxfit.test'));

  assert.equal(anonymous.status, 401);
  assert.equal(member.status, 403);
  assert.equal(standardTrainer.status, 200);
});

test('invoice lists the plan fee and the active reservations of the month', async () => {
  const response = await request(app)
    .get('/api/members/member-sara/invoice?month=2026-11')
    .set('Authorization', await login('trainer', 'admin@noxfit.test'));

  assert.equal(response.status, 200);
  assert.equal(response.body.invoice_number, 'FAC-202611-member-sara');
  assert.equal(response.body.lines.length, 3);
  assert.equal(response.body.lines[0].amount, 19.9);
  assert.equal(response.body.lines[1].amount, 10);
  assert.equal(response.body.lines[2].amount, 0);
  assert.match(response.body.lines[2].description, /bono/);
  assert.equal(response.body.total, 29.9);
  assert.equal(Math.round((response.body.tax_base + response.body.tax) * 100) / 100, 29.9);
});

test('members download their own invoice as PDF', async () => {
  const token = await login('member', 'sara@noxfit.test');
  const pdf = await request(app)
    .get('/api/members/me/invoice?month=2026-11&format=pdf')
    .set('Authorization', token)
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  const trainerOnly = await request(app).get('/api/members/me/invoice').set('Authorization', await login('trainer', 'admin@noxfit.test'));

  assert.equal(pdf.status, 200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.match(pdf.headers['content-disposition'], /FAC-202611-member-sara\.pdf/);
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
  assert.equal(trainerOnly.status, 403);
});

test('invoice supports an escaped HTML format and validates its params', async () => {
  const token = await login('trainer', 'admin@noxfit.test');
  const html = await request(app).get('/api/members/member-sara/invoice?month=2026-11&format=html').set('Authorization', token);
  const badMonth = await request(app).get('/api/members/member-sara/invoice?month=2026-13').set('Authorization', token);
  const badFormat = await request(app).get('/api/members/member-sara/invoice?format=xml').set('Authorization', token);
  const missing = await request(app).get('/api/members/nobody/invoice').set('Authorization', token);

  assert.equal(html.status, 200);
  assert.match(html.headers['content-type'], /text\/html/);
  assert.match(html.text, /Sara &lt;Manzano&gt;/);
  assert.equal(badMonth.status, 400);
  assert.equal(badFormat.status, 400);
  assert.equal(missing.status, 404);
});
