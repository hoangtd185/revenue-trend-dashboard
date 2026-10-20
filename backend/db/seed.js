#!/usr/bin/env node
/**
 * Seeds the database with:
 *   - one admin user (ADMIN_EMAIL / ADMIN_PASSWORD from .env, password is re-hashed on every run)
 *   - 4 weeks of sample revenue data ending with the current week
 *
 *   node db/seed.js          -> insert the sample weeks only when the database has no weeks yet (safe to re-run,
 *                               never brings back weeks an admin deleted)
 *   node db/seed.js --reset  -> delete ALL weeks first, then insert the sample data
 */
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const config = require('../src/config');
const { addDays, mondayOf } = require('../src/utils/dates');

// Values shaped like the reference video (Mon..Sun).
const SAMPLE_WEEKS = [
  {
    // current week
    offsetWeeks: 0,
    pos: [1730, 1970, 1810, 1970, 2010, 2000, 2410],
    eatclub: [290, 340, 320, 340, 370, 630, 410],
    labour: [570, 660, 880, 670, 690, 790, 1180],
    covers: [104, 118, 112, 121, 133, 152, 193],
    events: { 4: ['negative', 'Heavy rain, lower walk-ins'], 5: ['positive', 'Local food festival'] },
  },
  {
    // previous week
    offsetWeeks: -1,
    pos: [1610, 1830, 1570, 1850, 1870, 2000, 2150],
    eatclub: [280, 330, 280, 350, 340, 660, 390],
    labour: [550, 630, 790, 630, 650, 770, 1080],
    covers: [96, 110, 98, 113, 120, 140, 175],
    events: {},
  },
  {
    offsetWeeks: -2,
    pos: [1540, 1790, 1600, 1760, 1810, 2150, 2240],
    eatclub: [270, 300, 290, 310, 330, 560, 380],
    labour: [530, 610, 760, 600, 640, 820, 1090],
    covers: [92, 104, 99, 108, 115, 146, 168],
    events: { 6: ['positive', 'Public holiday'] },
  },
  {
    offsetWeeks: -3,
    pos: [1500, 1700, 1650, 1720, 1760, 2080, 2190],
    eatclub: [250, 290, 300, 300, 310, 540, 360],
    labour: [520, 600, 740, 610, 630, 800, 1050],
    covers: [88, 101, 100, 104, 110, 139, 162],
    events: { 2: ['negative', 'Kitchen equipment outage'] },
  },
];

async function main() {
  const reset = process.argv.includes('--reset');
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Admin user
    const { email, password, name } = config.seedAdmin;
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO admin_users (email, name, password_hash) VALUES (lower($1), $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
      [email, name, hash],
    );
    console.log(`Admin user ready: ${email.toLowerCase()}`);

    // 2) Sample weeks
    if (reset) {
      await client.query('DELETE FROM report_weeks');
      console.log('Removed all existing weeks (--reset).');
    } else {
      const { rows } = await client.query('SELECT count(*)::int AS n FROM report_weeks');
      if (rows[0].n > 0) {
        await client.query('COMMIT');
        console.log(`Database already has ${rows[0].n} week(s); sample data skipped (use --reset to reload it).`);
        return;
      }
    }

    const thisMonday = mondayOf(new Date());
    let inserted = 0;
    for (const sample of SAMPLE_WEEKS) {
      const weekStart = addDays(thisMonday, sample.offsetWeeks * 7);
      const { rows } = await client.query(
        `INSERT INTO report_weeks (week_start) VALUES ($1)
         ON CONFLICT (week_start) DO NOTHING RETURNING id`,
        [weekStart],
      );
      if (!rows[0]) {
        console.log(`Week ${weekStart} already exists, skipped.`);
        continue;
      }
      const weekId = rows[0].id;
      for (let i = 0; i < 7; i += 1) {
        const [impact, note] = sample.events[i] || [null, null];
        await client.query(
          `INSERT INTO daily_metrics
             (week_id, day_index, pos_revenue, eatclub_revenue, labour_cost, covers, event_impact, event_note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [weekId, i, sample.pos[i], sample.eatclub[i], sample.labour[i], sample.covers[i], impact, note],
        );
      }
      inserted += 1;
      console.log(`Inserted sample week ${weekStart}.`);
    }

    await client.query('COMMIT');
    console.log(`Seed complete (${inserted} week(s) inserted).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
