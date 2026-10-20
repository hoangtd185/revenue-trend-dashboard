const { badRequest } = require('./httpError');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parses ?page=&pageSize= (1-based). Throws 400 on invalid values. */
function parsePagination(query = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? DEFAULT_PAGE_SIZE : Number(query.pageSize);

  const details = [];
  if (!Number.isInteger(page) || page < 1) details.push('page must be an integer >= 1');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    details.push(`pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  if (details.length) throw badRequest('Invalid pagination parameters', details);

  return { page, pageSize, offset: (page - 1) * pageSize };
}

function paginated(data, { page, pageSize }, totalItems) {
  return {
    data,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

module.exports = { parsePagination, paginated, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
