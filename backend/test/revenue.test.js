// Unit tests for the pure business logic. Run with: npm test  (uses node:test, no DB needed)
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDays, summarize, percentChange, buildTrend, validateDays } = require('../src/services/revenue');
const { addDays, isMonday, mondayOf } = require('../src/utils/dates');
const { parsePagination, paginated } = require('../src/utils/pagination');
const { HttpError, errorBody } = require('../src/utils/httpError');

test('normalizeDays always returns 7 days Mon..Sun and fills gaps with zeros', () => {
  const days = normalizeDays([{ day_index: 2, pos_revenue: 100, eatclub_revenue: 50, labour_cost: 30, covers: 4 }]);
  assert.equal(days.length, 7);
  assert.equal(days[0].label, 'Mon');
  assert.equal(days[6].label, 'Sun');
  assert.equal(days[2].posRevenue, 100);
  assert.equal(days[3].posRevenue, 0);
});

test('summarize computes totals and the daily average', () => {
  const days = normalizeDays(
    Array.from({ length: 7 }, (_, i) => ({ day_index: i, pos_revenue: 100, eatclub_revenue: 40, labour_cost: 10, covers: 3 })),
  );
  assert.deepEqual(summarize(days), { totalRevenue: 980, averagePerDay: 140, totalCovers: 21, totalLabour: 70 });
});

test('percentChange rounds to one decimal and handles a missing baseline', () => {
  assert.equal(percentChange(16614, 15544), 6.9);
  assert.equal(percentChange(933, 852), 9.5);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(10, null), null);
});

test('buildTrend attaches previous-week values per day and comparison %', () => {
  const week = { id: 2, week_start: '2026-10-19', updated_at: 'x' };
  const prevWeek = { id: 1, week_start: '2026-10-12' };
  const trend = buildTrend({
    week,
    currentRows: [{ day_index: 0, pos_revenue: 110, eatclub_revenue: 0, labour_cost: 0, covers: 11 }],
    previousWeek: prevWeek,
    previousRows: [{ day_index: 0, pos_revenue: 100, eatclub_revenue: 0, labour_cost: 0, covers: 10 }],
  });
  assert.equal(trend.days[0].previous.posRevenue, 100);
  assert.equal(trend.summary.change.totalRevenue, 10);
  assert.equal(trend.summary.change.totalCovers, 10);
});

test('buildTrend without a previous week has no comparison', () => {
  const trend = buildTrend({ week: { id: 1, week_start: '2026-10-19' }, currentRows: [], previousWeek: null, previousRows: [] });
  assert.equal(trend.previousWeek, null);
  assert.equal(trend.summary.previous, null);
  assert.equal(trend.days[0].previous, null);
});

test('validateDays accepts valid payloads and coerces numeric strings', () => {
  const { value, errors } = validateDays([
    { dayIndex: 0, posRevenue: '1200.456', eatclubRevenue: 300, labourCost: 500, covers: '80', eventImpact: 'positive', eventNote: ' Promo ' },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(value[0].posRevenue, 1200.46);
  assert.equal(value[0].covers, 80);
  assert.equal(value[0].eventNote, 'Promo');
  assert.equal(value.length, 7, 'full mode always returns the whole week');
  assert.equal(value[1].posRevenue, 0);
});

test('validateDays partial mode returns only the provided days (for PATCH)', () => {
  const { value, errors } = validateDays([{ dayIndex: 4, posRevenue: 10 }, { dayIndex: 1, posRevenue: 5 }], { partial: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(value.map((d) => d.dayIndex), [1, 4]);
  assert.ok(validateDays([], { partial: true }).errors.length > 0, 'PATCH needs at least one day');
});

test('validateDays drops a note when there is no event impact', () => {
  const { value } = validateDays([{ dayIndex: 0, eventNote: 'orphan note' }]);
  assert.equal(value[0].eventNote, null);
});

test('validateDays rejects bad input', () => {
  assert.ok(validateDays('nope').errors.length > 0);
  assert.ok(validateDays([{ dayIndex: 9 }]).errors.length > 0);
  assert.ok(validateDays([{ dayIndex: 0, posRevenue: -1 }]).errors.length > 0);
  assert.ok(validateDays([{ dayIndex: 0, covers: 1.5 }]).errors.length > 0);
  assert.ok(validateDays([{ dayIndex: 0, eventImpact: 'meh' }]).errors.length > 0);
  assert.ok(validateDays([{ dayIndex: 1 }, { dayIndex: 1 }]).errors.length > 0);
});

test('date helpers', () => {
  assert.equal(addDays('2026-10-19', -7), '2026-10-12');
  assert.equal(isMonday('2026-10-19'), true);
  assert.equal(isMonday('2026-10-20'), false);
  assert.equal(isMonday('2026-02-30'), false);
  assert.equal(mondayOf(new Date('2026-10-25T12:00:00Z')), '2026-10-19');
});

test('parsePagination defaults, offsets and bounds', () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 20, offset: 0 });
  assert.deepEqual(parsePagination({ page: '3', pageSize: '10' }), { page: 3, pageSize: 10, offset: 20 });
  assert.throws(() => parsePagination({ page: '0' }), (err) => err instanceof HttpError && err.status === 400);
  assert.throws(() => parsePagination({ pageSize: '101' }), HttpError);
  assert.throws(() => parsePagination({ pageSize: 'abc' }), HttpError);
  assert.deepEqual(paginated([1, 2], { page: 1, pageSize: 2 }, 5).pagination, {
    page: 1,
    pageSize: 2,
    totalItems: 5,
    totalPages: 3,
  });
});

test('errorBody always has the { error: { code, message } } shape', () => {
  assert.deepEqual(errorBody('NOT_FOUND', 'nope'), { error: { code: 'NOT_FOUND', message: 'nope' } });
  assert.deepEqual(errorBody('VALIDATION_ERROR', 'bad', ['x']).error.details, ['x']);
});
