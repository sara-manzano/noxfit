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
const Trainer = require('../src/models/trainers');
const Reservation = require('../src/models/reservations');
const SessionPackPurchase = require('../src/models/sessionPackPurchases');

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
  await Promise.all([Member.syncIndexes(), SessionPackPurchase.syncIndexes(), Reservation.syncIndexes()]);
});

beforeEach(async () => {
  Object.assign(process.env, billingEnv);
  await Promise.all([Reservation.deleteMany({}), Trainer.deleteMany({}), SessionPackPurchase.deleteMany({})]);
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

const packEvent = (overrides = {}, type = 'checkout.session.completed') => ({
  id: 'evt_pack',
  object: 'event',
  type,
  data: {
    object: {
      id: 'cs_pack_1',
      mode: 'payment',
      payment_status: 'paid',
      client_reference_id: 'member-billing',
      amount_total: 4500,
      currency: 'eur',
      metadata: { member_id: 'member-billing', pack: 'pack_5' },
      ...overrides,
    },
  },
});

const getCredits = async () => (await Member.findOne({ member_id: 'member-billing' }).lean()).session_credits;

test('pack summary lists packs and the current credit balance', async () => {
  const response = await request(app).get('/api/billing/packs').set('Authorization', await login());

  assert.equal(response.status, 200);
  assert.equal(response.body.session_credits, 0);
  assert.deepEqual(response.body.packs.map((pack) => [pack.pack, pack.sessions, pack.amount]), [
    ['pack_5', 5, 45],
    ['pack_10', 10, 80],
  ]);
});

test('pack checkout validates the pack and creates a one-off payment session', async () => {
  const token = await login();
  const stripe = getStripe();
  mock.method(stripe.customers, 'create', async () => ({ id: 'cus_1' }));
  const createSession = mock.method(stripe.checkout.sessions, 'create', async () => ({ url: 'https://checkout.test/pack' }));

  const invalid = await request(app).post('/api/billing/packs/checkout').set('Authorization', token).send({ pack: 'pack_99' });
  const created = await request(app).post('/api/billing/packs/checkout').set('Authorization', token).send({ pack: 'pack_10' });

  assert.equal(invalid.status, 400);
  assert.equal(created.status, 201);
  assert.equal(created.body.url, 'https://checkout.test/pack');

  const [params] = createSession.mock.calls[0].arguments;

  assert.equal(params.mode, 'payment');
  assert.equal(params.client_reference_id, 'member-billing');
  assert.equal(params.line_items[0].price_data.unit_amount, 8000);
  assert.deepEqual(params.metadata, { member_id: 'member-billing', pack: 'pack_10' });
});

test('paid pack checkouts add credits exactly once and unpaid ones are ignored', async () => {
  const unpaid = await sendWebhook(packEvent({ payment_status: 'unpaid' }));
  assert.equal(unpaid.status, 200);
  assert.equal(await getCredits(), 0);

  await sendWebhook(packEvent());
  await sendWebhook(packEvent());
  assert.equal(await getCredits(), 5);

  const delayed = await sendWebhook(packEvent({ id: 'cs_pack_2' }, 'checkout.session.async_payment_succeeded'));
  assert.equal(delayed.status, 200);
  assert.equal(await getCredits(), 10);
  assert.equal(await SessionPackPurchase.countDocuments(), 2);
});

test('a booking consumes a credit and cancelling refunds it', async () => {
  const token = await login();
  await Trainer.create({
    trainer_id: 'trainer-pack',
    full_name: 'Trainer Pack',
    email: 'trainer-pack@noxfit.test',
    password_hash: await hashPassword(PASSWORD),
    activity_type: 'CrossFit',
  });
  await sendWebhook(packEvent());

  const created = await request(app).post('/api/reservations').set('Authorization', token).send({
    trainer_id: 'trainer-pack',
    date: '2030-06-03',
    time_slot: '10:00 - 11:00',
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.credit_used, true);
  assert.equal(await getCredits(), 4);

  const cancelled = await request(app)
    .post(`/api/reservations/${created.body.reservation_id}/cancel`)
    .set('Authorization', token);

  assert.equal(cancelled.status, 200);
  assert.equal(await getCredits(), 5);

  const again = await request(app)
    .post(`/api/reservations/${created.body.reservation_id}/cancel`)
    .set('Authorization', token);

  assert.equal(again.status, 409);
  assert.equal(await getCredits(), 5);
});

const createPackTrainer = async () => Trainer.create({
  trainer_id: 'trainer-gate',
  full_name: 'Trainer Gate',
  email: 'trainer-gate@noxfit.test',
  password_hash: await hashPassword(PASSWORD),
  activity_type: 'CrossFit',
  is_admin: true,
});

const bookAs = (token, body) => request(app).post('/api/reservations').set('Authorization', token).send(body);

test('booking without credits or an active subscription is rejected with 402', async () => {
  await Trainer.create({
    trainer_id: 'trainer-pack',
    full_name: 'Trainer Pack',
    email: 'trainer-pack@noxfit.test',
    password_hash: await hashPassword(PASSWORD),
    activity_type: 'CrossFit',
  });

  const response = await bookAs(await login(), { trainer_id: 'trainer-pack', date: '2030-06-03', time_slot: '10:00 - 11:00' });

  assert.equal(response.status, 402);
  assert.equal(await Reservation.countDocuments(), 0);
});

test('active subscribers book without spending credits', async () => {
  await createPackTrainer();
  await sendWebhook(subscriptionEvent('customer.subscription.updated'));
  await sendWebhook(packEvent());

  const response = await bookAs(await login(), { trainer_id: 'trainer-gate', date: '2030-06-03', time_slot: '10:00 - 11:00' });

  assert.equal(response.status, 201);
  assert.equal(response.body.credit_used, false);
  assert.equal(await getCredits(), 5);
});

test('trainer bookings spend the member credit and are refused when none is left', async () => {
  await createPackTrainer();
  const trainerLogin = await request(app)
    .post('/api/auth/login')
    .send({ role: 'trainer', email: 'trainer-gate@noxfit.test', password: PASSWORD });
  const trainerToken = `Bearer ${trainerLogin.body.token}`;
  const payload = { member_id: 'member-billing', trainer_id: 'trainer-gate', time_slot: '10:00 - 11:00' };

  const refused = await bookAs(trainerToken, { ...payload, date: '2030-06-03' });
  await sendWebhook(packEvent());
  const created = await bookAs(trainerToken, { ...payload, date: '2030-06-04' });

  assert.equal(refused.status, 402);
  assert.equal(created.status, 201);
  assert.equal(created.body.credit_used, true);
  assert.equal(await getCredits(), 4);
});
