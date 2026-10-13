require('dotenv').config();
const app = require('./app');
const connectToDatabase = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectToDatabase();

  return app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('The server could not be started:', error.message);
    process.exit(1);
  });
}

module.exports = { startServer };