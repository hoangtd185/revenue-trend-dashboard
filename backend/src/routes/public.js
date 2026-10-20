const express = require('express');
const repo = require('../services/weeksRepo');
const { buildTrend } = require('../services/revenue');
const { mondayOf, parseIsoDate } = require('../utils/dates');
const { badRequest, notFound } = require('../utils/httpError');
const { parsePagination, paginated } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /api/public/revenue-trend[?week=YYYY-MM-DD]
 * Returns the requested week (any date inside it) or the latest one, plus the week before it for comparison.
 */
router.get(
  '/revenue-trend',
  asyncHandler(async (req, res) => {
    let week;
    if (req.query.week !== undefined) {
      const date = parseIsoDate(String(req.query.week));
      if (!date) throw badRequest('week must be a date in YYYY-MM-DD format');
      week = await repo.findWeekByStart(mondayOf(date));
      if (!week) throw notFound(`No data for the week of ${mondayOf(date)}`);
    } else {
      week = await repo.findLatestWeek();
      if (!week) throw notFound('No revenue data has been published yet');
    }

    const previousWeek = await repo.findPreviousWeek(week);
    const [currentRows, previousRows] = await Promise.all([
      repo.getDays(week.id),
      previousWeek ? repo.getDays(previousWeek.id) : Promise.resolve([]),
    ]);

    res.set('Cache-Control', 'no-store');
    res.json(buildTrend({ week, currentRows, previousWeek, previousRows }));
  }),
);

/** GET /api/public/weeks?page=&pageSize= -> weeks that have data, newest first. */
router.get(
  '/weeks',
  asyncHandler(async (req, res) => {
    const page = parsePagination(req.query);
    const { rows, total } = await repo.listWeeks({ limit: page.pageSize, offset: page.offset });
    res.json(paginated(rows.map((w) => ({ id: w.id, weekStart: w.week_start })), page, total));
  }),
);

module.exports = router;
