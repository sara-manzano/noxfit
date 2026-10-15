const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const { ALLOWED_FORMATS, INVALID_FILE_TYPE_MESSAGE } = require('./config/cloudinary');
const { sendError } = require('./http/responses');
const openApiDocument = require('../openapi.json');

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
    sendError(res, 400, 'Image must be 2 MB or smaller');
    return true;
  }

  sendError(res, 400, 'Image upload could not be completed');
  return true;
};

const handleKnownAppError = (error, res) => {
  if (error.message === INVALID_FILE_TYPE_MESSAGE) {
    sendError(res, 400, `Invalid image format. Allowed formats: ${allowedImageFormats}`);
    return true;
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((entry) => entry.message);
    sendError(res, 400, messages.join(', '));
    return true;
  }

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'field';
    sendError(res, 409, `${duplicatedField} is already in use`);
    return true;
  }

  if (error.name === 'CastError') {
    sendError(res, 400, 'Invalid identifier');
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
app.get('/api/openapi.json', (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  explorer: true,
}));

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

app.use('/api', (_req, res) => sendError(res, 404, 'Resource was not found'));

app.use((error, _req, res, _next) => {
  if (shouldLogError(error)) {
    console.error(error);
  }

  if (handleMulterError(error, res) || handleKnownAppError(error, res)) {
    return;
  }

  return sendError(res, 500, 'Internal server error');
});

module.exports = app;