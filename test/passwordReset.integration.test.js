const assert = require('node:assert/strict');
const { after, before, mock, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'noxfit-test-secret';
delete process.env.SMTP_HOST;

const app = require('../src/app');
const { hashPassword } = require('../src/config/auth');
const Member = require('../src/models/members');

let mongoServer;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Member.create({
    member_id: 'member-reset',
    full_name: 'Reset Member',
    email: 'reset@noxfit.test',
    password_hash: await hashPassword('OldPassword1'),
  });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const requestResetToken = async (email) => {
  const log = mock.method(console, 'log', () => {});
  const response = await request(app).post('/api/auth/forgot-password').send({ role: 'member', email });
  const logged = log.mock.calls.map((call) => String(call.arguments[0])).join('\n');
  log.mock.restore();

  return { response, token: logged.match(/reset=([a-f0-9]+)/)?.[1] };
};

test('forgot-password answers the same for unknown emails and sends no link', async () => {
  const { response, token } = await requestResetToken('nobody@noxfit.test');

  assert.equal(response.status, 202);
  assert.equal(token, undefined);
});

test('reset flow updates the password once and the token cannot be reused', async () => {
  const { response, token } = await requestResetToken('reset@noxfit.test');

  assert.equal(response.status, 202);
  assert.ok(token);

  const reset = await request(app)
    .post('/api/auth/reset-password')
    .send({ role: 'member', token, password: 'NewPassword1' });
  assert.equal(reset.status, 200);

  const oldLogin = await request(app)
    .post('/api/auth/login')
    .send({ role: 'member', email: 'reset@noxfit.test', password: 'OldPassword1' });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request(app)
    .post('/api/auth/login')
    .send({ role: 'member', email: 'reset@noxfit.test', password: 'NewPassword1' });
  assert.equal(newLogin.status, 200);

  const reuse = await request(app)
    .post('/api/auth/reset-password')
    .send({ role: 'member', token, password: 'AnotherPass1' });
  assert.equal(reuse.status, 400);
});

test('reset-password rejects an invalid token', async () => {
  const response = await request(app)
    .post('/api/auth/reset-password')
    .send({ role: 'member', token: 'deadbeef', password: 'NewPassword1' });

  assert.equal(response.status, 400);
});
