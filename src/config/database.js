const mongoose = require('mongoose');

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('The MONGODB_URI variable is missing.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    throw error;
  }
};

module.exports = connectToDatabase;