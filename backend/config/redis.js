const { createClient } = require('redis');
const logger = require('./logger');

const redisUrl = process.env.NODE_ENV === 'test' ? '' : String(process.env.REDIS_URL || '').trim();
const redisClient = redisUrl
    ? createClient({
        url: redisUrl,
        socket: {
            connectTimeout: 5000,
        },
    })
    : null;

if (redisClient) {
    redisClient.on('error', (err) => {
        logger.error({ err }, 'Redis client error');
    });
    redisClient.on('reconnecting', () => {
        logger.warn('Redis reconnecting');
    });
}

async function connectRedis() {
    if (!redisClient) return false;
    if (redisClient.isReady) return true;
    await redisClient.connect();
    logger.info('Connected to Redis');
    return true;
}

async function closeRedis() {
    if (redisClient?.isOpen) {
        await redisClient.close();
        logger.info('Redis connection closed');
    }
}

function isRedisConfigured() {
    return Boolean(redisClient);
}

function getRedisClient() {
    return redisClient;
}

module.exports = {
    connectRedis,
    closeRedis,
    getRedisClient,
    isRedisConfigured,
};
