const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const app = require('../src/app');

test('openapi json endpoint exposes the shared contract', async () => {
  const response = await request(app).get('/api/openapi.json');

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(response.body.openapi, '3.1.0');
  assert.ok(response.body.paths['/auth/login']);
  assert.ok(response.body.paths['/members']);
  assert.ok(response.body.paths['/trainers']);
  assert.ok(response.body.paths['/reservations']);
  assert.equal(response.body.paths['/members/register'], undefined);
  assert.equal(response.body.paths['/members/login'], undefined);
  assert.equal(response.body.paths['/trainers/login'], undefined);
});

test('swagger ui is served from the backend', async () => {
  const response = await request(app).get('/api/docs');

  assert.equal(response.status, 301);
  assert.equal(response.headers.location, '/api/docs/');

  const htmlResponse = await request(app).get('/api/docs/');

  assert.equal(htmlResponse.status, 200);
  assert.match(htmlResponse.headers['content-type'], /text\/html/);
  assert.match(htmlResponse.text, /Swagger UI/);
});