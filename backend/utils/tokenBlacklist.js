'use strict';

const crypto = require('node:crypto');
const logger = require('../config/logger');
const {
  isRedisEnabled,
  sendCommand,
} = require('./redisClient');

const revoked = new Map(); // hashed token -> expiresAt (ms epoch)
const REDIS_PREFIX = 'qmetric:jwt-revoked:';
const FALLBACK_TTL_MS = 72 * 60 * 60 * 1000;

function keyFor(token) {
  return `${REDIS_PREFIX}${crypto.createHash('sha256').update(token).digest('hex')}`;
}

function localRevoke(token, expSeconds) {
  const expiresAt = expSeconds
    ? Number(expSeconds) * 1000
    : Date.now() + FALLBACK_TTL_MS;
  revoked.set(keyFor(token), expiresAt);
}

async function revoke(token, expSeconds) {
  if (!token || typeof token !== 'string') return;

  localRevoke(token, expSeconds);

  if (!isRedisEnabled()) return;

  const ttlSeconds = Math.max(
    1,
    Math.ceil(((Number(expSeconds) * 1000) - Date.now()) / 1000) || Math.floor(FALLBACK_TTL_MS / 1000)
  );

  try {
    await sendCommand('SET', keyFor(token), '1', 'EX', String(ttlSeconds));
  } catch (err) {
    logger.error({ err }, 'Redis revoke failed; local blacklist fallback used');
  }
}

async function isRevoked(token) {
  if (!token || typeof token !== 'string') return false;

  const key = keyFor(token);

  if (isRedisEnabled()) {
    try {
      const value = await sendCommand('EXISTS', key);
      if (Number(value) === 1) return true;
    } catch (err) {
      logger.error({ err }, 'Redis blacklist lookup failed; checking local fallback');
    }
  }

  const expiresAt = revoked.get(key);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    revoked.delete(key);
    return false;
  }
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of revoked.entries()) {
    if (now >= expiresAt) revoked.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = { revoke, isRevoked };
