const { Pool, types } = require('pg');
const config = require('./config');

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects
// (avoids timezone shifts when a DATE is turned into local midnight).
types.setTypeParser(1082, (value) => value);
// NUMERIC -> JS number (values here are money with 2 decimals, well within float precision).
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const pool = new Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query: (text, params) => pool.query(text, params), withTransaction };
