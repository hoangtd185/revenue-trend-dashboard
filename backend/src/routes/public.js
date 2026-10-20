const express = require('express');
const repo = require('../services/weeksRepo');
const { buildTrend } = require('../services/revenue');
const { notFound } = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /api/public/revenue-trend
 * The latest week plus the week before it (for "Compare to Previous").
 */
router.get(
  '/revenue-trend',
  asyncHandler(async (req, res) => {
    const week = await repo.findLatestWeek();
    if (!week) throw notFound('No revenue data has been published yet');

    const previousWeek = await repo.findPreviousWeek(week);
    const [currentRows, previousRows] = await Promise.all([
      repo.getDays(week.id),
      previousWeek ? repo.getDays(previousWeek.id) : Promise.resolve([]),
    ]);

    res.set('Cache-Control', 'no-store');
    res.json(buildTrend({ week, currentRows, previousWeek, previousRows }));
  }),
);

module.exports = router;
