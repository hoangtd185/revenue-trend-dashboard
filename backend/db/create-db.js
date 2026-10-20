#!/usr/bin/env node
/**
 * Creates the database named in DATABASE_URL if it does not exist yet.
 * It connects to the server's default "postgres" maintenance database to do so.
 */
const { Client } = require('pg');
const config = require('../src/config');

async function main() {
  const target = new URL(config.databaseUrl);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!dbName) throw new Error('DATABASE_URL must include a database name');

  const adminUrl = new URL(config.databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount > 0) {
      console.log(`Database "${dbName}" already exists.`);
      return;
    }
    // Identifiers cannot be parameterised; escape double quotes defensively.
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Database "${dbName}" created.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`Could not create database: ${err.message}`);
  process.exit(1);
});
