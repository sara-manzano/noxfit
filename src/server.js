require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/database');
const { getJwtSecret } = require('./config/auth');
const Reservation = require('./models/reservations');
const Waitlist = require('./models/waitlist');
const mongoose = require('mongoose');
const { startReminderJob } = require('./jobs/reminders');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  getJwtSecret();
  await connectToDatabase();
  await Promise.all([Reservation.syncIndexes(), Waitlist.syncIndexes()]);

  const reminderTimer = process.env.REMINDERS_ENABLED !== 'false' ? startReminderJob() : null;
  const server = app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));

  if (require.main === module) {
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      clearInterval(reminderTimer);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  }

  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };