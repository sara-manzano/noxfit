const assert = require('node:assert/strict');
const { after, afterEach, before, beforeEach, mock, test } = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const Stripe = require('stripe');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'noxfit-test-secret';

const app = require('../src/app');
const { hashPassword } = require('../src/config/auth');
const { getStripe } = require('../src/config/stripe');
const Member = require('../src/models/members');

const PASSWORD = 'Noxfit123';
const WEBHOOK_SECRET = 'whsec_test_secret';
const billingEnv = {
  STRIPE_SECRET_KEY: 'sk_test_noxfit',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_PREMIUM: 'price_premium',
  STRIPE_PRICE_VIP: 'price_vip',
};

let mongoServer;

const login = async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ role: 'member', email: 'billing@noxfit.test', password: PASSWORD });

  return `Bearer ${response.body.token}`;
};

const sendWebhook = (event, { secret = WEBHOOK_SECRET } = {}) => {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });

  return request(app)
    .post('/api/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature)
    .send(payload);
};

const subscriptionEvent = (type, overrides = {}) => ({
  id: 'evt_1',
  object: 'event',
  type,
  data: {
    object: {
      id: 'sub_1',
      object: 'subscription',
      customer: 'cus_1',
      status: 'active',
      cancel_at_period_end: false,
      metadata: { member_id: 'member-billing' },
      items: { data: [{ price: { id: 'price_premium' }, current_period_end: 1893456000 }] },
      ...overrides,
    },
  },
});

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Member.syncIndexes();
});

beforeEach(async () => {
  Object.assign(process.env, billingEnv);
  await Member.deleteMany({});
  await Member.create({
    member_id: 'member-billing',
    full_name: 'Billing Member',
    email: 'billing@noxfit.test',
    password_hash: await hashPassword(PASSWORD),
    membership_type: 'Básica',
  });
});

afterEach(() => {
  mock.restoreAll();
});

after(async () => {
  for (const key of Object.keys(billingEnv)) {
    delete process.env[key];
  }

  await mongoose.disconnect();
  await mongoServer?.stop();
});

test('billing endpoints require a member session', async () => {
  const anonymous = await request(app).get('/api/billing/subscription');

  assert.equal(anonymous.status, 401);
});

test('subscription summary reports configured plans without leaking Stripe ids', async () => {
  const response = await request(app).get('/api/billing/subscription').set('Authorization', await login());

  assert.equal(response.status, 200);
  assert.equal(response.body.configured, true);
  assert.deepEqual(response.body.available_plans, ['Premium', 'VIP']);
  assert.equal(response.body.membership_type, 'Básica');
  assert.equal(response.body.status, null);
  assert.equal(response.body.stripe_customer_id, undefined);
});

test('checkout returns 503 when Stripe is not configured', async () => {
  const token = await login();
  delete process.env.STRIPE_SECRET_KEY;

  const response = await request(app).post('/api/billing/checkout').set('Authorization', token).send({ plan: 'Premium' });

  assert.equal(response.status, 503);
});

test('checkout validates the plan and creates a Stripe session', async () => {
  const token = await login();
  const stripe = getStripe();
  const createCustomer = mock.method(stripe.customers, 'create', async () => ({ id: 'cus_1' }));
  const createSession = mock.method(stripe.checkout.sessions, 'create', async () => ({ url: 'https://checkout.test/session' }));

  const invalid = await request(app).post('/api/billing/checkout').set('Authorization', token).send({ plan: 'Oro' });
  const unavailable = await request(app).post('/api/billing/checkout').set('Authorization', token).send({ plan: 'Básica' });
  const created = await request(app).post('/api/billing/checkout').set('Authorization', token).send({ plan: 'Premium' });

  assert.equal(invalid.status, 400);
  assert.equal(unavailable.status, 503);
  assert.equal(created.status, 201);
  assert.equal(created.body.url, 'https://checkout.test/session');
  assert.equal(createCustomer.mock.callCount(), 1);

  const [sessionParams] = createSession.mock.calls[0].arguments;

  assert.equal(sessionParams.mode, 'subscription');
  assert.equal(sessionParams.customer, 'cus_1');
  assert.equal(sessionParams.client_reference_id, 'member-billing');
  assert.deepEqual(sessionParams.line_items, [{ price: 'price_premium', quantity: 1 }]);
});

test('webhook rejects invalid signatures', async () => {
  const response = await sendWebhook(subscriptionEvent('customer.subscription.updated'), { secret: 'whsec_wrong' });

  assert.equal(response.status, 400);
});

test('webhook applies, updates and removes a subscription', async () => {
  const completed = await sendWebhook({
    id: 'evt_0',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { mode: 'subscription', client_reference_id: 'member-billing', customer: 'cus_1', subscription: 'sub_1' } },
  });
  const updated = await sendWebhook(subscriptionEvent('customer.subscription.updated'));
  const afterUpdate = await Member.findOne({ member_id: 'member-billing' }).select('+stripe_customer_id').lean();

  assert.equal(completed.status, 200);
  assert.equal(updated.status, 200);
  assert.equal(afterUpdate.membership_type, 'Premium');
  assert.equal(afterUpdate.subscription_status, 'active');
  assert.equal(afterUpdate.stripe_customer_id, 'cus_1');
  assert.equal(afterUpdate.subscription_current_period_end.toISOString(), '2030-01-01T00:00:00.000Z');

  const pastDue = await sendWebhook(subscriptionEvent('customer.subscription.updated', { status: 'past_due', cancel_at_period_end: true }));
  const afterPastDue = await Member.findOne({ member_id: 'member-billing' }).lean();

  assert.equal(pastDue.status, 200);
  assert.equal(afterPastDue.subscription_status, 'past_due');
  assert.equal(afterPastDue.subscription_cancel_at_period_end, true);
  assert.equal(afterPastDue.membership_type, 'Premium');

  await sendWebhook(subscriptionEvent('customer.subscription.deleted', { status: 'canceled' }));
  const afterDelete = await Member.findOne({ member_id: 'member-billing' }).lean();

  assert.equal(afterDelete.subscription_status, 'canceled');
  assert.equal(afterDelete.membership_type, 'Básica');
});

test('active subscribers are sent to the portal instead of a second checkout', async () => {
  const token = await login();
  await sendWebhook(subscriptionEvent('customer.subscription.updated'));
  const stripe = getStripe();
  mock.method(stripe.billingPortal.sessions, 'create', async () => ({ url: 'https://portal.test/session' }));

  const checkout = await request(app).post('/api/billing/checkout').set('Authorization', token).send({ plan: 'VIP' });
  const portal = await request(app).post('/api/billing/portal').set('Authorization', token);

  assert.equal(checkout.status, 409);
  assert.equal(portal.status, 201);
  assert.equal(portal.body.url, 'https://portal.test/session');
});

test('invoice history is mapped from Stripe', async () => {
  const token = await login();
  await sendWebhook(subscriptionEvent('customer.subscription.updated'));
  const stripe = getStripe();
  mock.method(stripe.invoices, 'list', async () => ({
    data: [{
      id: 'in_1',
      number: 'NOX-0001',
      status: 'paid',
      amount_paid: 1990,
      currency: 'eur',
      created: 1893456000,
      hosted_invoice_url: 'https://invoice.test/1',
      invoice_pdf: 'https://invoice.test/1.pdf',
    }],
  }));

  const response = await request(app).get('/api/billing/invoices').set('Authorization', token);

  assert.equal(response.status, 200);
  assert.equal(response.body.total, 1);
  assert.equal(response.body.items[0].amount_paid, 19.9);
  assert.equal(response.body.items[0].invoice_id, 'in_1');
});
