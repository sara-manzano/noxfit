const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { ALLOWED_FORMATS, INVALID_FILE_TYPE_MESSAGE } = require('./config/cloudinary');
const { sendError } = require('./http/responses');

const membersRoutes = require('./routes/membersRoutes');
const trainersRoutes = require('./routes/trainersRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');

const app = express();
const allowedImageFormats = Object.values(ALLOWED_FORMATS).join(', ');

const shouldLogError = (error) => !error?.statusCode || error.statusCode >= 500;

const handleMulterError = (error, res) => {
  if (!(error instanceof multer.MulterError)) {
    return false;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    sendError(res, 400, 'La imagen debe ocupar 2 MB o menos');
    return true;
  }

  sendError(res, 400, 'No se pudo completar la subida de imagen');
  return true;
};

const handleKnownAppError = (error, res) => {
  if (error.message === INVALID_FILE_TYPE_MESSAGE) {
    sendError(res, 400, `Formato de imagen no valido. Formatos permitidos: ${allowedImageFormats}`);
    return true;
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((entry) => entry.message);
    sendError(res, 400, messages.join(', '));
    return true;
  }

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'field';
    sendError(res, 409, `${duplicatedField} ya esta en uso`);
    return true;
  }

  if (error.name === 'CastError') {
    sendError(res, 400, 'Identificador no valido');
    return true;
  }

  if (error.statusCode) {
    sendError(res, error.statusCode, error.message);
    return true;
  }

  return false;
};

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

app.use('/api', (_req, res) => sendError(res, 404, 'Recurso no encontrado'));

app.use((error, _req, res, _next) => {
  if (shouldLogError(error)) {
    console.error(error);
  }

  if (handleMulterError(error, res) || handleKnownAppError(error, res)) {
    return;
  }

  return sendError(res, 500, 'Error interno del servidor');
});


module.exports = app;