require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/database');
const Reservation = require('./models/reservations');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectToDatabase();
  // Recrea el índice de socio, que ahora ignora reservas sin socio.
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