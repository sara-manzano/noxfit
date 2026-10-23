require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/database');
const Reservation = require('./models/reservations');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectToDatabase();
  await Reservation.syncIndexes();

  return app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };