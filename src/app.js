const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');

const membersRoutes = require('./routes/membersRoutes');
const trainersRoutes = require('./routes/trainersRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'Noxfit API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/members', membersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/reservations', reservationsRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'The image cannot exceed 2 MB' });
    }

    return res.status(400).json({ error: 'The image upload could not be processed' });
  }

  if (error.message === 'Invalid file type') {
    return res.status(400).json({ error: 'Invalid image format. Use jpg, jpeg, png or webp' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((entry) => entry.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({ error: `${duplicatedField} already exists` });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'The identifier is not valid' });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  return res.status(500).json({ error: 'An internal error occurred' });
});


module.exports = app;