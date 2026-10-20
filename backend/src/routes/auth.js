const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');
const { signToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { unauthorized, validationError, tooManyRequests } = require('../utils/httpError');

const router = express.Router();

// Small in-memory brute-force guard: max 10 failed logins / 15 min per IP.
// (Single-process only; use a shared store such as Redis when running several instances.)
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const failures = new Map();

function tooManyAttempts(ip) {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILS;
}

function recordFailure(ip) {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(ip, { first: Date.now(), count: 1 });
  else entry.count += 1;
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});

// Used when the email doesn't exist so the response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const ip = req.ip;
    if (tooManyAttempts(ip)) throw tooManyRequests('Too many failed attempts. Try again later.');

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const missing = [];
    if (!email) missing.push('email is required');
    if (!password) missing.push('password is required');
    if (missing.length) throw validationError(missing);

    const { rows } = await db.query(
      'SELECT id, email, name, password_hash FROM admin_users WHERE lower(email) = $1',
      [email],
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      recordFailure(ip);
      throw unauthorized('Invalid email or password');
    }

    failures.delete(ip);
    const token = signToken(user);
    res.cookie(config.cookieName, token, cookieOptions());
    return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  }),
);

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

module.exports = router;
