const Member = require('../models/members');
const Reservation = require('../models/reservations');
const SessionPackPurchase = require('../models/sessionPackPurchases');
const { createStatusError } = require('../http/errors');

const ENTITLED_STATUSES = ['active', 'trialing'];

const getId = (reference) => reference?._id || reference;

// Returns false when the checkout session was already credited.
const creditPackPurchase = async ({ session, memberId, pack }) => {
  try {
    await SessionPackPurchase.create({
      checkout_session_id: session.id,
      member: memberId,
      pack: pack.pack,
      sessions: pack.sessions,
      amount_cents: session.amount_total ?? pack.amount_cents,
      currency: session.currency || pack.currency,
    });
  } catch (error) {
    if (error.code === 11000) {
      return false;
    }

    throw error;
  }

  try {
    await Member.updateOne({ _id: memberId }, { $inc: { session_credits: pack.sessions } });
  } catch (error) {
    await SessionPackPurchase.deleteOne({ checkout_session_id: session.id });
    throw error;
  }

  return true;
};

// Active subscribers book without credits; everyone else spends one. Returns true when a credit was taken.
const takeSessionCredit = async (memberReference) => {
  const memberId = getId(memberReference);

  if (await Member.exists({ _id: memberId, subscription_status: { $in: ENTITLED_STATUSES } })) {
    return false;
  }

  const consumed = await Member.findOneAndUpdate(
    { _id: memberId, session_credits: { $gt: 0 } },
    { $inc: { session_credits: -1 } },
    { projection: { _id: 1 } }
  );

  if (!consumed) {
    throw createStatusError('No session credits left: buy a pack or subscribe to book', 402);
  }

  return true;
};

const returnCredit = (memberId) => Member.updateOne({ _id: getId(memberId) }, { $inc: { session_credits: 1 } });

// The credit_used flip is atomic so a credit is never refunded twice.
const refundReservationCredit = async (reservation) => {
  if (!reservation?.credit_used || !reservation.member) {
    return false;
  }

  const claimed = await Reservation.findOneAndUpdate(
    { _id: reservation._id, credit_used: true },
    { $set: { credit_used: false } },
    { projection: { _id: 1 } }
  );

  if (!claimed) {
    return false;
  }

  await returnCredit(reservation.member);

  return true;
};

const refundDeletedReservationCredit = async (reservation) => {
  if (!reservation?.credit_used || !reservation.member) {
    return false;
  }

  await returnCredit(reservation.member);

  return true;
};

module.exports = {
  creditPackPurchase,
  refundDeletedReservationCredit,
  refundReservationCredit,
  returnCredit,
  takeSessionCredit,
};
