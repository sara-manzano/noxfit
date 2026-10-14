const mongoose = require('mongoose');

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectToDatabase;