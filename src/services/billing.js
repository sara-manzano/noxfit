const Member = require('../models/members');
const { getPlanForPriceId, getSessionPack } = require('../config/stripe');
const { creditPackPurchase } = require('./sessionCredits');

const ENTITLED_STATUSES = ['active', 'trialing'];
const DEFAULT_PLAN = 'Básica';

const toDate = (seconds) => (typeof seconds === 'number' ? new Date(seconds * 1000) : undefined);

const getCustomerId = (customer) => (typeof customer === 'string' ? customer : customer?.id);

const findMemberForSubscription = async (subscription) => {
  const customerId = getCustomerId(subscription.customer);
  const byCustomer = customerId ? await Member.findOne({ stripe_customer_id: customerId }).select('_id').lean() : null;

  if (byCustomer) {
    return byCustomer;
  }

  return subscription.metadata?.member_id
    ? Member.findOne({ member_id: subscription.metadata.member_id }).select('_id').lean()
    : null;
};

const applySubscription = async (subscription) => {
  const member = await findMemberForSubscription(subscription);

  if (!member) {
    return;
  }

  const item = subscription.items?.data?.[0];
  const plan = getPlanForPriceId(item?.price?.id) || subscription.metadata?.plan;
  const update = {
    stripe_customer_id: getCustomerId(subscription.customer),
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_current_period_end: toDate(item?.current_period_end ?? subscription.current_period_end),
    subscription_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  };

  if (plan && ENTITLED_STATUSES.includes(subscription.status)) {
    update.membership_type = plan;
  }

  await Member.updateOne({ _id: member._id }, { $set: update });
};

const applySubscriptionDeleted = async (subscription) => {
  const member = await findMemberForSubscription(subscription);

  if (!member) {
    return;
  }

  await Member.updateOne({ _id: member._id }, {
    $set: {
      subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
      membership_type: DEFAULT_PLAN,
    },
  });
};

const applyPackPayment = async (session) => {
  const memberId = session.client_reference_id || session.metadata?.member_id;
  const pack = getSessionPack(session.metadata?.pack);

  if (session.payment_status !== 'paid' || !memberId || !pack) {
    return;
  }

  const member = await Member.findOne({ member_id: memberId }).select('_id').lean();

  if (member) {
    await creditPackPurchase({ session, memberId: member._id, pack });
  }
};

const applyCheckoutCompleted = async (session) => {
  if (session.mode === 'payment') {
    return applyPackPayment(session);
  }

  const memberId = session.client_reference_id;

  if (session.mode !== 'subscription' || !memberId) {
    return;
  }

  await Member.updateOne({ member_id: memberId }, {
    $set: {
      stripe_customer_id: getCustomerId(session.customer),
      stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    },
  });
};

const applyStripeEvent = async (event) => {
  const object = event.data?.object;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return applyCheckoutCompleted(object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return applySubscription(object);
    case 'customer.subscription.deleted':
      return applySubscriptionDeleted(object);
    default:
      return undefined;
  }
};

module.exports = { applyStripeEvent };
