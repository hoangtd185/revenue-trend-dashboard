#!/usr/bin/env node
/**
 * Minimal, dependency-light SQL migration runner.
 *
 *   node db/migrate.js          -> apply all pending migrations (in filename order)
 *   node db/migrate.js status   -> list applied / pending migrations
 *
 * Each file in db/migrations/*.sql runs inside its own transaction and is
 * recorded in the `schema_migrations` table so it is never applied twice.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../src/config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function main() {
  const command = process.argv[2] || 'up';
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await ensureTable(client);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = listMigrationFiles();

    if (command === 'status') {
      for (const file of files) {
        console.log(`${applied.has(file) ? '[x] applied' : '[ ] pending'}  ${file}`);
      }
      return;
    }

    if (command !== 'up') {
      throw new Error(`Unknown command "${command}". Use "up" or "status".`);
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log('Database is up to date. No pending migrations.');
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('done');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        throw err;
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
