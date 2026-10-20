/**
 * Pure business logic for the revenue trend (no DB access) so it is easy to unit test.
 */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EVENT_IMPACTS = ['positive', 'negative'];
const MAX_AMOUNT = 9_999_999_999.99; // NUMERIC(12,2)

const round2 = (n) => Math.round(n * 100) / 100;

function emptyDay(dayIndex) {
  return {
    dayIndex,
    label: DAY_LABELS[dayIndex],
    posRevenue: 0,
    eatclubRevenue: 0,
    labourCost: 0,
    covers: 0,
    eventImpact: null,
    eventNote: null,
  };
}

/** Map DB rows (any order, possibly missing days) to exactly 7 days Mon..Sun. */
function normalizeDays(rows = []) {
  const days = DAY_LABELS.map((_, i) => emptyDay(i));
  for (const row of rows) {
    const i = Number(row.day_index ?? row.dayIndex);
    if (!(i >= 0 && i <= 6)) continue;
    days[i] = {
      dayIndex: i,
      label: DAY_LABELS[i],
      posRevenue: Number(row.pos_revenue ?? row.posRevenue ?? 0),
      eatclubRevenue: Number(row.eatclub_revenue ?? row.eatclubRevenue ?? 0),
      labourCost: Number(row.labour_cost ?? row.labourCost ?? 0),
      covers: Number(row.covers ?? 0),
      eventImpact: row.event_impact ?? row.eventImpact ?? null,
      eventNote: row.event_note ?? row.eventNote ?? null,
    };
  }
  return days;
}

function summarize(days) {
  const totalRevenue = days.reduce((s, d) => s + d.posRevenue + d.eatclubRevenue, 0);
  const totalLabour = days.reduce((s, d) => s + d.labourCost, 0);
  const totalCovers = days.reduce((s, d) => s + d.covers, 0);
  return {
    totalRevenue: round2(totalRevenue),
    averagePerDay: round2(totalRevenue / days.length),
    totalCovers,
    totalLabour: round2(totalLabour),
  };
}

/** Percentage change rounded to 1 decimal; null when there is no baseline. */
function percentChange(current, previous) {
  if (previous === null || previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function buildTrend({ week, currentRows, previousWeek, previousRows }) {
  const currentDays = normalizeDays(currentRows);
  const current = summarize(currentDays);
  const previousDays = previousWeek ? normalizeDays(previousRows) : null;
  const previous = previousDays ? summarize(previousDays) : null;

  return {
    week: { id: week.id, weekStart: week.week_start, updatedAt: week.updated_at },
    previousWeek: previousWeek ? { id: previousWeek.id, weekStart: previousWeek.week_start } : null,
    days: currentDays.map((d, i) => ({
      ...d,
      previous: previousDays
        ? {
            posRevenue: previousDays[i].posRevenue,
            eatclubRevenue: previousDays[i].eatclubRevenue,
            labourCost: previousDays[i].labourCost,
            covers: previousDays[i].covers,
          }
        : null,
    })),
    summary: {
      current,
      previous,
      change: previous
        ? {
            totalRevenue: percentChange(current.totalRevenue, previous.totalRevenue),
            averagePerDay: percentChange(current.averagePerDay, previous.averagePerDay),
            totalCovers: percentChange(current.totalCovers, previous.totalCovers),
          }
        : null,
    },
  };
}

function validateAmount(value, field, errors, { integer = false } = {}) {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    errors.push(`${field} must be a number`);
    return 0;
  }
  if (n < 0) errors.push(`${field} must be >= 0`);
  if (n > MAX_AMOUNT) errors.push(`${field} is too large`);
  if (integer && !Number.isInteger(n)) errors.push(`${field} must be a whole number`);
  return integer ? n : round2(n);
}

/**
 * Validate the `days` array sent by the admin UI.
 *
 *   validateDays(input)                    -> full week: missing days are filled with zeros (create)
 *   validateDays(input, { partial: true }) -> only the provided days, at least one (PATCH)
 *
 * Returns { value: day[] | null, errors: string[] }.
 */
function validateDays(input, { partial = false } = {}) {
  const errors = [];
  if (!Array.isArray(input)) {
    return { value: null, errors: ['days must be an array'] };
  }
  if (input.length > 7) errors.push('days can contain at most 7 entries');
  if (partial && input.length === 0) errors.push('days must contain at least one entry');

  const provided = new Map();

  input.forEach((raw, position) => {
    const prefix = `days[${position}]`;
    if (!raw || typeof raw !== 'object') {
      errors.push(`${prefix} must be an object`);
      return;
    }
    const dayIndex = Number(raw.dayIndex);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
      errors.push(`${prefix}.dayIndex must be an integer 0 (Mon) .. 6 (Sun)`);
      return;
    }
    if (provided.has(dayIndex)) {
      errors.push(`${prefix}.dayIndex ${dayIndex} is duplicated`);
      return;
    }

    const eventImpact = raw.eventImpact === '' || raw.eventImpact === undefined ? null : raw.eventImpact;
    if (eventImpact !== null && !EVENT_IMPACTS.includes(eventImpact)) {
      errors.push(`${prefix}.eventImpact must be "positive", "negative" or null`);
    }
    let eventNote = raw.eventNote == null ? null : String(raw.eventNote).trim();
    if (eventNote === '') eventNote = null;
    if (eventNote && eventNote.length > 200) errors.push(`${prefix}.eventNote must be <= 200 characters`);

    provided.set(dayIndex, {
      dayIndex,
      label: DAY_LABELS[dayIndex],
      posRevenue: validateAmount(raw.posRevenue, `${prefix}.posRevenue`, errors),
      eatclubRevenue: validateAmount(raw.eatclubRevenue, `${prefix}.eatclubRevenue`, errors),
      labourCost: validateAmount(raw.labourCost, `${prefix}.labourCost`, errors),
      covers: validateAmount(raw.covers, `${prefix}.covers`, errors, { integer: true }),
      eventImpact,
      // a note without an impact has nothing to annotate
      eventNote: eventImpact ? eventNote : null,
    });
  });

  if (errors.length) return { value: null, errors };
  const value = partial
    ? [...provided.values()].sort((a, b) => a.dayIndex - b.dayIndex)
    : DAY_LABELS.map((_, i) => provided.get(i) ?? emptyDay(i));
  return { value, errors };
}

module.exports = { DAY_LABELS, normalizeDays, summarize, percentChange, buildTrend, validateDays };
