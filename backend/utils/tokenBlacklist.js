/**
 * In-memory JWT revocation list.
 *
 * Tokens are added on logout and rejected by authenticateToken until
 * their original expiry. Entries auto-expire so the Set does not grow
 * without bound.
 *
 * ⚠️ Single-instance only. For multi-instance deployments, swap for a
 *    Redis-backed set: on logout, `SETEX blacklist:<jti> <ttl> 1`, and
 *    on authenticate, `EXISTS blacklist:<jti>`.
 */

const revoked = new Map(); // token -> expiresAt (ms epoch)

function revoke(token, expSeconds) {
  if (!token) return;
  const expiresAt = (expSeconds || 0) * 1000;
  // Fallback: if no exp claim, keep for 72h (matches your JWT lifetime)
  revoked.set(token, expiresAt || Date.now() + 72 * 60 * 60 * 1000);
}

function isRevoked(token) {
  const expiresAt = revoked.get(token);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    revoked.delete(token);
    return false;
  }
  return true;
}

// Cleanup sweep every 10 minutes — keeps memory bounded
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of revoked.entries()) {
    if (now >= expiresAt) revoked.delete(token);
  }
}, 10 * 60 * 1000).unref();

module.exports = { revoke, isRevoked };