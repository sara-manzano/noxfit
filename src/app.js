const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { sendError } = require('./http/responses');
const openApiDocument = require('../openapi.json');

const authRoutes = require('./routes/authRoutes');
const membersRoutes = require('./routes/membersRoutes');
const trainersRoutes = require('./routes/trainersRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const highlightsRoutes = require('./routes/highlightsRoutes');

const app = express();

const shouldLogError = (error) => !error?.statusCode || error.statusCode >= 500;

const handleError = (error, _req, res, _next) => {
  if (shouldLogError(error)) {
    console.error(error);
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((entry) => entry.message);
    return sendError(res, 400, messages.join(', '));
  }

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0] || 'field';
    return sendError(res, 409, `${duplicatedField} is already in use`);
  }

  if (error.name === 'CastError') {
    return sendError(res, 400, 'Invalid identifier');
  }

  if (error.statusCode) {
    return sendError(res, error.statusCode, error.message);
  }

  return sendError(res, 500, 'Internal server error');
};

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});
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

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/highlights', highlightsRoutes);

app.use('/api', (_req, res) => sendError(res, 404, 'Resource was not found'));

app.use(handleError);

module.exports = app;