'use strict';
function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } });
}
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (process.env.APP_ENV !== 'test') console.error(`[${new Date().toISOString()}]`, err.message);
  res.status(status).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: status === 500 ? 'Something went wrong. Please try again.' : err.message },
  });
}
module.exports = { notFound, errorHandler };
