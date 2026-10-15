/**
 * Escape all regex metacharacters in a user-supplied string.
 * Prevents ReDoS via catastrophic backtracking (e.g., `(a+)+$`).
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;