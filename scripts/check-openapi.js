const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'openapi.json');

const requiredPaths = [
  '/health',
  '/auth/login',
  '/members',
  '/trainers',
  '/trainers/register',
  '/reservations',
];

const requiredSchemas = [
  'Member',
  'Trainer',
  'Reservation',
  'ErrorResponse',
];

const rawSpec = fs.readFileSync(specPath, 'utf8');
const spec = JSON.parse(rawSpec);

if (spec.openapi !== '3.1.0') {
  throw new Error(`Expected OpenAPI 3.1.0 but received ${spec.openapi || 'undefined'}`);
}

for (const route of requiredPaths) {
  if (!spec.paths?.[route]) {
    throw new Error(`Missing required route in openapi.json: ${route}`);
  }
}

for (const schemaName of requiredSchemas) {
  if (!spec.components?.schemas?.[schemaName]) {
    throw new Error(`Missing required schema in openapi.json: ${schemaName}`);
  }
}

if (!spec.components?.securitySchemes?.bearerAuth) {
  throw new Error('Missing bearerAuth security scheme in openapi.json');
}

console.log('OpenAPI contract looks valid');