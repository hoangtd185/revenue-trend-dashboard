const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../utils/httpError');

function signToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email, name: user.name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[config.cookieName] || null;
}

/** Rejects the request with 401 unless it carries a valid admin JWT (cookie or Bearer). */
function requireAdmin(req, res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.admin = { id: Number(payload.sub), email: payload.email, name: payload.name };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired session'));
  }
}

module.exports = { signToken, requireAdmin };
