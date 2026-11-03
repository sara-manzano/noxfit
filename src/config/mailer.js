const nodemailer = require('nodemailer');
const { formatReservationDate } = require('../services/reservationTime');

const createTransport = () => {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
};

const deliver = async ({ to, subject, text }) => {
  const transport = createTransport();

  if (!transport) {
    const body = process.env.NODE_ENV === 'production' ? '' : `\n${text}`;

    console.log(`[mailer] SMTP_HOST not set. To: ${to}\nSubject: ${subject}${body}`);
    return;
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || 'Noxfit <no-reply@noxfit.es>',
    to,
    subject,
    text,
  });
};

const sendPasswordResetEmail = (to, resetUrl) => deliver({
  to,
  subject: 'Reset your Noxfit password',
  text: `To choose a new password, open this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this message.`,
});

const reservationEmailTemplates = {
  confirmation: {
    subject: 'Reservation confirmed at Noxfit',
    intro: 'Your reservation is confirmed.',
  },
  cancellation: {
    subject: 'Reservation cancelled at Noxfit',
    intro: 'Your reservation has been cancelled.',
  },
  rescheduled: {
    subject: 'Reservation rescheduled at Noxfit',
    intro: 'Your reservation has a new date or time.',
  },
  reminder: {
    subject: 'Reminder: your Noxfit session starts in less than 24 hours',
    intro: 'This is a reminder that you have a session within the next 24 hours.',
  },
  waitlist_promoted: {
    subject: 'You got a spot at Noxfit',
    intro: 'A spot opened up and your reservation from the waiting list is confirmed.',
  },
};

const buildReservationEmail = (kind, reservation) => {
  const template = reservationEmailTemplates[kind];

  if (!template) {
    throw new Error(`Unknown reservation email kind: ${kind}`);
  }

  const lines = [
    template.intro,
    '',
    `Activity: ${reservation.activity_type || 'Session'}`,
    `Date: ${formatReservationDate(reservation.date)}`,
    `Time: ${reservation.time_slot}`,
  ];

  if (reservation.center) {
    lines.push(`Center: ${reservation.center}`);
  }

  if (reservation.trainer?.full_name) {
    lines.push(`Trainer: ${reservation.trainer.full_name}`);
  }

  return { subject: template.subject, text: lines.join('\n') };
};

const sendReservationEmail = (to, kind, reservation) => deliver({
  to,
  ...buildReservationEmail(kind, reservation),
});

module.exports = { sendPasswordResetEmail, sendReservationEmail };
