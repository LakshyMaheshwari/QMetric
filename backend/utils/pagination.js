/**
 * Pagination utility for list endpoints
 * Provides consistent pagination across all controllers
 */

/**
 * Extract pagination params from request query
 * @param {Object} req - Express request object
 * @param {number} defaultLimit - Default items per page (default: 20)
 * @param {number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} { skip, limit, page }
 */
function paginate(req, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(req.query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { skip, limit, page };
}

/**
 * Build pagination metadata object
 * @param {number} total - Total number of documents
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function getPaginationMeta(total, page, limit) {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
  };
}

/**
 * Extract safe sort options from query parameters
 * @param {Object} req - Express request object
 * @param {Array<string>} allowedFields - List of allowed field names to sort by
 * @param {Object} defaultSort - Default sort object (default: { createdAt: -1 })
 * @returns {Object} MongoDB sort object
 */
function getSortOptions(req, allowedFields = ['createdAt'], defaultSort = { createdAt: -1 }) {
  const { sortBy, order } = req.query;
  if (sortBy && allowedFields.includes(sortBy)) {
    const sortOrder = (order && (order.toLowerCase() === 'asc' || order === '1')) ? 1 : -1;
    return { [sortBy]: sortOrder };
  }
  return defaultSort;
}

module.exports = { paginate, getPaginationMeta, getSortOptions };