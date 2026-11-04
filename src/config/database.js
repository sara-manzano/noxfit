const mongoose = require('mongoose');

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required.');
  }

  const connectionOptions = {};

  if (process.env.DB_NAME) {
    connectionOptions.dbName = process.env.DB_NAME;
  }

  await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
  console.log('MongoDB connected');
};

module.exports = connectToDatabase;