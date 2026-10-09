const mongoose = require('mongoose');

const connectToDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('The MONGODB_URI environment variable is required.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
    throw error;
  }
};

module.exports = connectToDatabase;