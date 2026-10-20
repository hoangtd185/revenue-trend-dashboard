/**
 * Single error contract for the whole API:
 *   { "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [...] } }
 *
 * Route handlers throw an HttpError; the error middleware in app.js turns it into that shape.
 */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = 'Authentication required') => new HttpError(401, 'UNAUTHORIZED', message);
const notFound = (message = 'Resource not found') => new HttpError(404, 'NOT_FOUND', message);
const conflict = (message) => new HttpError(409, 'CONFLICT', message);
const validationError = (details, message = 'Validation failed') =>
  new HttpError(422, 'VALIDATION_ERROR', message, details);
const tooManyRequests = (message) => new HttpError(429, 'RATE_LIMITED', message);

function errorBody(code, message, details) {
  return { error: { code, message, ...(details && details.length ? { details } : {}) } };
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  validationError,
  tooManyRequests,
  errorBody,
};
