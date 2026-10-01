/**
 * Access-token revocation with Redis when configured, and an in-memory
 * fallback for single-instance development/tests.
 */
const crypto = require('node:crypto');
const {
    getRedisClient,
    isRedisConfigured,
} = require('../config/redis');

const revoked = new Map(); // hash -> expiresAt (ms epoch)
const KEY_PREFIX = 'qmetric:jwt:blacklist:';

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function revoke(token, expSeconds) {
    if (!token) return;

    const ttlSeconds = Math.max(
        1,
        Math.ceil(
            ((expSeconds || 0) * 1000 - Date.now()) / 1000
        ) || 72 * 60 * 60
    );

    if (isRedisConfigured()) {
        const client = getRedisClient();
        if (client?.isReady) {
            await client.setEx(
                `${KEY_PREFIX}${hashToken(token)}`,
                ttlSeconds,
                '1'
            );
            return;
        }
    }

    revoked.set(hashToken(token), Date.now() + ttlSeconds * 1000);
}

async function isRevoked(token) {
    if (!token) return false;

    const tokenHash = hashToken(token);

    if (isRedisConfigured()) {
        const client = getRedisClient();
        if (client?.isReady) {
            return (await client.exists(`${KEY_PREFIX}${tokenHash}`)) === 1;
        }
    }

    const expiresAt = revoked.get(tokenHash);
    if (!expiresAt) return false;
    if (Date.now() >= expiresAt) {
        revoked.delete(tokenHash);
        return false;
    }
    return true;
}

setInterval(() => {
    const now = Date.now();
    for (const [tokenHash, expiresAt] of revoked.entries()) {
        if (now >= expiresAt) revoked.delete(tokenHash);
    }
}, 10 * 60 * 1000).unref();

module.exports = { revoke, isRevoked };
