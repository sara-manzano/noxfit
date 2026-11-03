require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/database');
const Reservation = require('./models/reservations');
const Waitlist = require('./models/waitlist');
const { startReminderJob } = require('./jobs/reminders');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectToDatabase();
  await Promise.all([Reservation.syncIndexes(), Waitlist.syncIndexes()]);

  if (process.env.REMINDERS_ENABLED !== 'false') {
    startReminderJob();
  }

  return app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };