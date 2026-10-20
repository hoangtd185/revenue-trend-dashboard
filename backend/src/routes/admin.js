const express = require('express');
const repo = require('../services/weeksRepo');
const { normalizeDays, summarize, validateDays } = require('../services/revenue');
const { isMonday } = require('../utils/dates');
const { requireAdmin } = require('../middleware/auth');
const { badRequest, conflict, notFound, validationError } = require('../utils/httpError');
const { parsePagination, paginated } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAdmin);

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('id must be a positive integer');
  return id;
}

function serializeWeek(week, rows) {
  const days = normalizeDays(rows);
  return {
    id: week.id,
    weekStart: week.week_start,
    createdAt: week.created_at,
    updatedAt: week.updated_at,
    days,
    summary: summarize(days),
  };
}

// GET /api/admin/weeks?page=&pageSize=
router.get(
  '/weeks',
  asyncHandler(async (req, res) => {
    const page = parsePagination(req.query);
    const { rows, total } = await repo.listWeeks({ limit: page.pageSize, offset: page.offset });
    const data = rows.map((w) => ({
      id: w.id,
      weekStart: w.week_start,
      updatedAt: w.updated_at,
      totalRevenue: Number(w.total_revenue),
      totalCovers: Number(w.total_covers),
    }));
    res.json(paginated(data, page, total));
  }),
);

// GET /api/admin/weeks/:id
router.get(
  '/weeks/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const week = await repo.findWeekById(id);
    if (!week) throw notFound('Week not found');
    res.json({ week: serializeWeek(week, await repo.getDays(id)) });
  }),
);

// POST /api/admin/weeks  { weekStart: 'YYYY-MM-DD' (Monday), days?: Day[] }  -> missing days are zeros
router.post(
  '/weeks',
  asyncHandler(async (req, res) => {
    const weekStart = String(req.body?.weekStart || '');
    const { value: days, errors } = validateDays(req.body?.days ?? []);
    if (!isMonday(weekStart)) errors.unshift('weekStart must be a Monday in YYYY-MM-DD format');
    if (errors.length) throw validationError(errors);

    if (await repo.findWeekByStart(weekStart)) throw conflict(`A week starting ${weekStart} already exists`);
    const week = await repo.createWeek(weekStart, days);
    res.status(201).location(`/api/admin/weeks/${week.id}`).json({ week: serializeWeek(week, await repo.getDays(week.id)) });
  }),
);

// PATCH /api/admin/weeks/:id  { days: Day[] }  -> only the days provided are changed
router.patch(
  '/weeks/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { value: days, errors } = validateDays(req.body?.days, { partial: true });
    if (errors.length) throw validationError(errors);

    const week = await repo.updateWeekDays(id, days);
    if (!week) throw notFound('Week not found');
    res.json({ week: serializeWeek(week, await repo.getDays(id)) });
  }),
);

// DELETE /api/admin/weeks/:id  -> idempotent: 204 whether or not it existed
router.delete(
  '/weeks/:id',
  asyncHandler(async (req, res) => {
    await repo.deleteWeek(parseId(req.params.id));
    res.status(204).end();
  }),
);

module.exports = router;
