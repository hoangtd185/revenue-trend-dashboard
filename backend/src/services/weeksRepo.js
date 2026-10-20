/** Data access for report weeks + daily metrics. */
const db = require('../db');
const { addDays } = require('../utils/dates');

const WEEK_COLUMNS = 'id, week_start, created_at, updated_at';
const DAY_COLUMNS =
  'day_index, pos_revenue, eatclub_revenue, labour_cost, covers, event_impact, event_note';

/** One page of weeks (newest first) with their totals, plus the overall count. */
async function listWeeks({ limit, offset }) {
  const [{ rows }, count] = await Promise.all([
    db.query(
      `SELECT w.id, w.week_start, w.created_at, w.updated_at,
              COALESCE(SUM(d.pos_revenue + d.eatclub_revenue), 0) AS total_revenue,
              COALESCE(SUM(d.covers), 0)::int                     AS total_covers
         FROM report_weeks w
         LEFT JOIN daily_metrics d ON d.week_id = w.id
        GROUP BY w.id
        ORDER BY w.week_start DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    db.query('SELECT count(*)::int AS total FROM report_weeks'),
  ]);
  return { rows, total: count.rows[0].total };
}

async function findWeekById(id) {
  const { rows } = await db.query(`SELECT ${WEEK_COLUMNS} FROM report_weeks WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findWeekByStart(weekStart) {
  const { rows } = await db.query(`SELECT ${WEEK_COLUMNS} FROM report_weeks WHERE week_start = $1`, [weekStart]);
  return rows[0] || null;
}

async function findLatestWeek() {
  const { rows } = await db.query(`SELECT ${WEEK_COLUMNS} FROM report_weeks ORDER BY week_start DESC LIMIT 1`);
  return rows[0] || null;
}

async function findPreviousWeek(week) {
  return findWeekByStart(addDays(week.week_start, -7));
}

async function getDays(weekId) {
  const { rows } = await db.query(
    `SELECT ${DAY_COLUMNS} FROM daily_metrics WHERE week_id = $1 ORDER BY day_index`,
    [weekId],
  );
  return rows;
}

/** Insert or update the given days of a week in ONE statement (no per-day round trips). */
async function upsertDays(client, weekId, days) {
  if (days.length === 0) return;
  const col = (key) => days.map((d) => d[key]);
  await client.query(
    `INSERT INTO daily_metrics
       (week_id, day_index, pos_revenue, eatclub_revenue, labour_cost, covers, event_impact, event_note)
     SELECT $1::int, t.*
       FROM unnest($2::smallint[], $3::numeric[], $4::numeric[], $5::numeric[], $6::int[], $7::text[], $8::text[]) AS t
     ON CONFLICT (week_id, day_index) DO UPDATE SET
       pos_revenue     = EXCLUDED.pos_revenue,
       eatclub_revenue = EXCLUDED.eatclub_revenue,
       labour_cost     = EXCLUDED.labour_cost,
       covers          = EXCLUDED.covers,
       event_impact    = EXCLUDED.event_impact,
       event_note      = EXCLUDED.event_note`,
    [
      weekId,
      col('dayIndex'),
      col('posRevenue'),
      col('eatclubRevenue'),
      col('labourCost'),
      col('covers'),
      col('eventImpact'),
      col('eventNote'),
    ],
  );
}

async function createWeek(weekStart, days) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO report_weeks (week_start) VALUES ($1) RETURNING ${WEEK_COLUMNS}`,
      [weekStart],
    );
    const week = rows[0];
    await upsertDays(client, week.id, days);
    return week;
  });
}

async function updateWeekDays(weekId, days) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE report_weeks SET updated_at = now() WHERE id = $1 RETURNING ${WEEK_COLUMNS}`,
      [weekId],
    );
    if (!rows[0]) return null;
    await upsertDays(client, weekId, days);
    return rows[0];
  });
}

async function deleteWeek(weekId) {
  const { rowCount } = await db.query('DELETE FROM report_weeks WHERE id = $1', [weekId]);
  return rowCount > 0;
}

module.exports = {
  listWeeks,
  findWeekById,
  findWeekByStart,
  findLatestWeek,
  findPreviousWeek,
  getDays,
  upsertDays,
  createWeek,
  updateWeekDays,
  deleteWeek,
};
