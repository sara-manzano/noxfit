const Member = require('../models/members');
const { sendItem, sendCollection } = require('../http/responses');
const { createStatusError, createForbiddenError } = require('../http/errors');
const { MEMBERSHIP_TYPES } = require('../config/validation');
const {
  getAvailablePlans,
  getPriceId,
  getSessionPack,
  getSessionPacks,
  getStripe,
  getWebhookSecret,
  isStripeConfigured,
} = require('../config/stripe');
const { getAppUrl } = require('../config/appUrl');
const { applyStripeEvent } = require('../services/billing');

const SUBSCRIBED_STATUSES = ['active', 'trialing', 'past_due'];
const INVOICE_HISTORY_LIMIT = 24;

const loadMember = async (req) => {
  if (req.auth?.role !== 'member') {
    throw createForbiddenError('Member access is required');
  }

  const member = await Member.findById(req.auth.accountId)
    .select('+stripe_customer_id +stripe_subscription_id')
    .lean();

  if (!member) {
    throw createStatusError('Member was not found', 404);
  }

  return member;
};

const ensureCustomer = async (stripe, member) => {
  if (member.stripe_customer_id) {
    return member.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: member.email,
    name: member.full_name,
    metadata: { member_id: member.member_id },
  });

  await Member.updateOne({ _id: member._id }, { $set: { stripe_customer_id: customer.id } });

  return customer.id;
};

const getSubscription = async (req, res) => {
  const member = await loadMember(req);

  return sendItem(res, {
    configured: isStripeConfigured(),
    available_plans: getAvailablePlans(),
    membership_type: member.membership_type,
    status: member.subscription_status || null,
    current_period_end: member.subscription_current_period_end || null,
    cancel_at_period_end: Boolean(member.subscription_cancel_at_period_end),
    has_billing_account: Boolean(member.stripe_customer_id),
  });
};

const createCheckoutSession = async (req, res) => {
  const member = await loadMember(req);
  const plan = req.body?.plan;

  if (!MEMBERSHIP_TYPES.includes(plan)) {
    throw createStatusError(`plan must be one of: ${MEMBERSHIP_TYPES.join(', ')}`, 400);
  }

  if (SUBSCRIBED_STATUSES.includes(member.subscription_status)) {
    throw createStatusError('You already have a subscription, use the billing portal to change it', 409);
  }

  const stripe = getStripe();
  const price = getPriceId(plan);
  const customer = await ensureCustomer(stripe, member);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: member.member_id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { member_id: member.member_id, plan } },
    success_url: `${getAppUrl()}/?billing=success`,
    cancel_url: `${getAppUrl()}/?billing=cancelled`,
  });

  return sendItem(res, { url: session.url }, 201);
};

const getSessionPacksSummary = async (req, res) => {
  const member = await loadMember(req);

  return sendItem(res, {
    configured: isStripeConfigured(),
    session_credits: member.session_credits ?? 0,
    packs: getSessionPacks().map((pack) => ({
      pack: pack.pack,
      sessions: pack.sessions,
      amount: pack.amount_cents / 100,
      currency: pack.currency,
    })),
  });
};

const createPackCheckoutSession = async (req, res) => {
  const member = await loadMember(req);
  const pack = getSessionPack(req.body?.pack);

  if (!pack) {
    throw createStatusError(`pack must be one of: ${getSessionPacks().map((item) => item.pack).join(', ')}`, 400);
  }

  const stripe = getStripe();
  const customer = await ensureCustomer(stripe, member);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer,
    client_reference_id: member.member_id,
    line_items: [{
      price_data: {
        currency: pack.currency,
        unit_amount: pack.amount_cents,
        product_data: { name: `Bono de ${pack.sessions} sesiones` },
      },
      quantity: 1,
    }],
    metadata: { member_id: member.member_id, pack: pack.pack },
    success_url: `${getAppUrl()}/?billing=pack_success`,
    cancel_url: `${getAppUrl()}/?billing=pack_cancelled`,
  });

  return sendItem(res, { url: session.url }, 201);
};

const createPortalSession = async (req, res) => {
  const member = await loadMember(req);

  if (!member.stripe_customer_id) {
    throw createStatusError('You do not have a billing account yet', 409);
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: member.stripe_customer_id,
    return_url: getAppUrl(),
  });

  return sendItem(res, { url: session.url }, 201);
};

const listInvoices = async (req, res) => {
  const member = await loadMember(req);

  if (!member.stripe_customer_id) {
    return sendCollection(res, []);
  }

  const invoices = await getStripe().invoices.list({
    customer: member.stripe_customer_id,
    limit: INVOICE_HISTORY_LIMIT,
  });

  return sendCollection(res, invoices.data.map((invoice) => ({
    invoice_id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amount_paid: invoice.amount_paid / 100,
    currency: invoice.currency,
    created_at: new Date(invoice.created * 1000),
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
  })));
};

const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, getWebhookSecret());
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createStatusError('Webhook signature verification failed', 400);
  }

  await applyStripeEvent(event);

  return res.status(200).json({ received: true });
};

module.exports = {
  getSubscription,
  createCheckoutSession,
  getSessionPacksSummary,
  createPackCheckoutSession,
  createPortalSession,
  listInvoices,
  handleWebhook,
};
