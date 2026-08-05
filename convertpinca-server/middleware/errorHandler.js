/**
 * Centralized error handler middleware.
 * Must be registered last in Express middleware chain.
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message || err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: {
      message: err.message || 'An unexpected error occurred.',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
