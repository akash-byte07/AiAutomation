export function notFound(req, res) {
  res.status(404).json({ code: 'NOT_FOUND', message: 'The requested resource was not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error.message);
  res.status(error.status || 500).json({ code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'Something went wrong.' });
}