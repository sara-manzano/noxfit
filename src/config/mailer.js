const nodemailer = require('nodemailer');

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

const sendPasswordResetEmail = async (to, resetUrl) => {
  const transport = createTransport();

  if (!transport) {
    console.log(`[mailer] SMTP_HOST not set. Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || 'Noxfit <no-reply@noxfit.es>',
    to,
    subject: 'Restablece tu contraseña de Noxfit',
    text: `Para elegir una nueva contraseña abre este enlace (válido durante 1 hora):\n\n${resetUrl}\n\nSi no lo has solicitado, ignora este mensaje.`,
  });
};

module.exports = { sendPasswordResetEmail };
