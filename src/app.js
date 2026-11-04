const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const { sendError } = require('./http/responses');
const openApiDocument = require('../openapi.json');

const authRoutes = require('./routes/authRoutes');
const membersRoutes = require('./routes/membersRoutes');
const trainersRoutes = require('./routes/trainersRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const billingRoutes = require('./routes/billingRoutes');
const highlightsRoutes = require('./routes/highlightsRoutes');
const { handleWebhook } = require('./controllers/billingController');

const app = express();

if (process.env.TRUST_PROXY) {
  app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}

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

const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);

// CSP desactivada para no romper Swagger UI; la API solo sirve JSON.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json({ limit: '100kb' }));
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
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    ok: dbConnected,
    service: 'Noxfit API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/highlights', highlightsRoutes);

app.use('/api', (_req, res) => sendError(res, 404, 'Resource was not found'));

app.use(handleError);

module.exports = app;