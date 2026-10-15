const mongoose = require('mongoose');
const AuditLog = require('../Model/AuditLog');
const { AUDIT_ACTION_VALUES } = require('./auditActions');
const logger = require('../config/logger');

/**
 * Log an audit entry (never throws — failures are swallowed)
 */
async function logAudit({
  userId,
  actorType = 'user',
  action,
  resource,
  changes = {},
  request = null,
  error = null,
}) {
  try {
    if (actorType === 'user' && (!userId || !mongoose.isValidObjectId(userId))) {
      // User-attributed audit entries require a valid Mongo user id.
      logger.warn({ userId }, 'logAudit: missing or invalid userId; skipping');
      return;
    }

    if (actorType !== 'user' && !['admin_secret', 'system'].includes(actorType)) {
      logger.warn({ actorType }, 'logAudit: invalid actorType; skipping');
      return;
    }

    if (!AUDIT_ACTION_VALUES.includes(action)) {
      logger.warn({ action }, 'logAudit: unregistered action');
    }

    const auditEntry = {
      action,
      actorType,
      resource,
      oldValue: changes.oldValue || null,
      newValue: changes.newValue || null,
      changes: changes.fields || [],
      status: error ? 'FAILED' : 'SUCCESS',
      ipAddress:
        request?.ip ||
        request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        'unknown',
      userAgent: request?.headers?.['user-agent'] || 'unknown',
      error: error?.message || null,
    };

    if (userId && mongoose.isValidObjectId(userId)) {
      auditEntry.userId = userId;
    }

    await AuditLog.create(auditEntry);
  } catch (err) {
    // Never crash the main operation because of audit logging
    logger.error({ err }, 'Failed to write audit log');
  }
}

module.exports = { logAudit };
