const getAppUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

module.exports = { getAppUrl };
