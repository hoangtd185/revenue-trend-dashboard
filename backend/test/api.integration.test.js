/**
 * End-to-end API tests against a real PostgreSQL database.
 *
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/revenue_dashboard_test npm run test:integration
 *
 * The database is created if needed, migrated and re-seeded (--reset), so NEVER point this at real data.
 * Skipped automatically when TEST_DATABASE_URL is not set. Uses Node's built-in fetch: no extra dependencies.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');

const TEST_DB = process.env.TEST_DATABASE_URL;
const ADMIN = { email: 'admin@example.com', password: 'Admin@123' };

test('API integration', { skip: !TEST_DB && 'set TEST_DATABASE_URL to run integration tests' }, async (t) => {
  // Configure the app for the test database BEFORE requiring it (config reads env at load time).
  Object.assign(process.env, {
    DATABASE_URL: TEST_DB,
    JWT_SECRET: 'integration-test-secret',
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
  });
  const root = path.join(__dirname, '..');
  const run = (script, ...args) =>
    execFileSync(process.execPath, [path.join(root, 'db', script), ...args], { env: process.env, stdio: 'pipe' });
  run('create-db.js');
  run('migrate.js');
  run('seed.js', '--reset');

  const app = require('../src/app');
  const { pool } = require('../src/db');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  let token;
  const call = async (method, url, body, auth = true) => {
    const res = await fetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  await t.test('health check reaches the database', async () => {
    const r = await call('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.database, 'ok');
  });

  await t.test('public trend returns the latest week with the previous week attached', async () => {
    const r = await call('GET', '/public/revenue-trend');
    assert.equal(r.status, 200);
    assert.equal(r.body.days.length, 7);
    assert.ok(r.body.previousWeek, 'seed data has a previous week');
    assert.ok(r.body.days[0].previous);
    assert.equal(typeof r.body.summary.change.totalRevenue, 'number');
  });


  await t.test('admin endpoints require authentication', async () => {
    const r = await call('GET', '/admin/weeks', undefined, false);
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('login rejects a wrong password and accepts the seeded admin', async () => {
    const wrong = await call('POST', '/auth/login', { email: ADMIN.email, password: 'nope' }, false);
    assert.equal(wrong.status, 401);
    const missing = await call('POST', '/auth/login', {}, false);
    assert.equal(missing.status, 422);
    assert.equal(missing.body.error.code, 'VALIDATION_ERROR');

    const ok = await call('POST', '/auth/login', ADMIN, false);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    token = ok.body.token;
  });

  await t.test('week list returns the seeded weeks, newest first', async () => {
    const r = await call('GET', '/admin/weeks');
    assert.equal(r.status, 200);
    assert.equal(r.body.weeks.length, 4);
    assert.ok(r.body.weeks[0].weekStart > r.body.weeks[1].weekStart);
  });

  let createdId;
  await t.test('create week: validation, success and conflict', async () => {
    const notMonday = await call('POST', '/admin/weeks', { weekStart: '2030-01-02' });
    assert.equal(notMonday.status, 422);

    const created = await call('POST', '/admin/weeks', {
      weekStart: '2030-01-07',
      days: [{ dayIndex: 0, posRevenue: 1000, eatclubRevenue: 200, labourCost: 300, covers: 50 }],
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.week.days.length, 7);
    assert.equal(created.body.week.summary.totalRevenue, 1200);
    createdId = created.body.week.id;

    const dup = await call('POST', '/admin/weeks', { weekStart: '2030-01-07' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'CONFLICT');
  });

  await t.test('PATCH only changes the days that are sent, and the public view reflects it', async () => {
    const r = await call('PATCH', `/admin/weeks/${createdId}`, {
      days: [{ dayIndex: 5, posRevenue: 2500, eatclubRevenue: 500, labourCost: 900, covers: 140, eventImpact: 'positive', eventNote: 'Festival' }],
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.week.days[0].posRevenue, 1000, 'Monday untouched');
    assert.equal(r.body.week.days[5].posRevenue, 2500);

    const invalid = await call('PATCH', `/admin/weeks/${createdId}`, { days: [{ dayIndex: 1, covers: -3 }] });
    assert.equal(invalid.status, 422);
    assert.ok(invalid.body.error.details.length > 0);

    // the 2030 week is now the latest one, so it is what the dashboard shows
    const pub = await call('GET', '/public/revenue-trend', undefined, false);
    assert.equal(pub.status, 200);
    assert.equal(pub.body.days[5].eventImpact, 'positive');
    assert.equal(pub.body.summary.current.totalRevenue, 4200);
    assert.equal(pub.body.previousWeek, null, 'no data for the week before');
  });
});
