const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const db = require('./db');
const { HttpError, errorBody } = require('./utils/httpError');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // the Next.js dev/prod server proxies /api/* from localhost

// Minimal security headers (an API never needs to be framed or MIME-sniffed).
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json(errorBody('NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`)));

// Every error leaves the API in the same shape: { error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(errorBody(err.code, err.message, err.details));
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(errorBody('BAD_REQUEST', 'Malformed JSON body'));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(errorBody('PAYLOAD_TOO_LARGE', 'Request body is too large'));
  }
  if (err.code === '23505') {
    return res.status(409).json(errorBody('CONFLICT', 'Duplicate record'));
  }
  console.error(err);
  return res.status(500).json(errorBody('INTERNAL_ERROR', 'Internal server error'));
});

module.exports = app;
