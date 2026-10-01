'use strict';

const { createClient } = require('redis');
const logger = require('../config/logger');

const redisUrl = typeof process.env.REDIS_URL === 'string'
    ? process.env.REDIS_URL.trim()
    : '';

const enabled = Boolean(redisUrl);
const client = enabled ? createClient({ url: redisUrl }) : null;
let connectPromise = null;

if (client) {
    client.on('error', (err) => {
        logger.error({ err }, 'Redis client error');
    });
}

async function ensureConnected() {
    if (!client) return false;
    if (client.isReady) return true;
    if (!connectPromise) {
        connectPromise = client.connect().catch((err) => {
            connectPromise = null;
            throw err;
        });
    }
    await connectPromise;
    return client.isReady;
}

async function connectRedis() {
    if (!enabled) return false;
    return ensureConnected();
}

async function sendCommand(...command) {
    if (!enabled) throw new Error('Redis is not configured');
    await ensureConnected();
    return client.sendCommand(command);
}

async function disconnectRedis() {
    if (!client) return;
    if (client.isOpen) {
        await client.quit();
    }
}

function isRedisEnabled() {
    return enabled;
}

function isRedisReady() {
    return Boolean(client?.isReady);
}

module.exports = {
    client,
    connectRedis,
    disconnectRedis,
    sendCommand,
    isRedisEnabled,
    isRedisReady,
};
