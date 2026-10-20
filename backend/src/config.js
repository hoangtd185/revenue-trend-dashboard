require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET', isProduction ? undefined : 'dev-only-insecure-secret-change-me');

module.exports = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/revenue_dashboard'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: 'admin_token',
  // Secure cookies need HTTPS; override with COOKIE_SECURE=false when running production mode over plain http (e.g. docker compose locally)
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  seedAdmin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    name: process.env.ADMIN_NAME || 'Admin',
  },
};
