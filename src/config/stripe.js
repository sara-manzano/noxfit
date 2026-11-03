const Stripe = require('stripe');
const { createStatusError } = require('../http/errors');

const PLAN_PRICE_ENV = {
  'Básica': 'STRIPE_PRICE_BASICA',
  Premium: 'STRIPE_PRICE_PREMIUM',
  VIP: 'STRIPE_PRICE_VIP',
};

let client;

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

const getStripe = () => {
  if (!isStripeConfigured()) {
    throw createStatusError('Billing is not configured', 503);
  }

  client ||= new Stripe(process.env.STRIPE_SECRET_KEY);

  return client;
};

const getPriceId = (plan) => {
  const priceId = process.env[PLAN_PRICE_ENV[plan]];

  if (!priceId) {
    throw createStatusError(`Plan ${plan} is not available for purchase`, 503);
  }

  return priceId;
};

const getPlanForPriceId = (priceId) => (
  Object.keys(PLAN_PRICE_ENV).find((plan) => process.env[PLAN_PRICE_ENV[plan]] === priceId)
);

const getAvailablePlans = () => Object.keys(PLAN_PRICE_ENV).filter((plan) => process.env[PLAN_PRICE_ENV[plan]]);

const getWebhookSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw createStatusError('Billing webhook is not configured', 503);
  }

  return process.env.STRIPE_WEBHOOK_SECRET;
};

module.exports = {
  getAvailablePlans,
  getPlanForPriceId,
  getPriceId,
  getStripe,
  getWebhookSecret,
  isStripeConfigured,
};
