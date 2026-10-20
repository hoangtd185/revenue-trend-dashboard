/** Date helpers working purely on 'YYYY-MM-DD' strings in UTC (no timezone drift). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = parseIsoDate(isoDate);
  if (!d) throw new Error(`Invalid date: ${isoDate}`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function isMonday(isoDate) {
  const d = parseIsoDate(isoDate);
  return !!d && d.getUTCDay() === 1;
}

/** Monday of the week that contains `date` (defaults to today, UTC). */
function mondayOf(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return toIsoDate(d);
}

module.exports = { parseIsoDate, toIsoDate, addDays, isMonday, mondayOf };
