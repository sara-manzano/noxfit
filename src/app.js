const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');

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

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'The file cannot exceed 2MB' });
    }

    return res.status(400).json({ error: 'Error uploading the file' });
  }

  if (error.message === 'Invalid file type') {
    return res.status(400).json({ error: 'Unsupported image format. Please use jpg, jpeg, png or webp' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((entry) => entry.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'ID invalid' });
  }

  return res.status(500).json({ error: 'Something has gone wrong' });
});


module.exports = app;