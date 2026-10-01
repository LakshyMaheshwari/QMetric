const logger = require('../config/logger');

const mongoose = require('mongoose');
const AuditLog = require('../Model/AuditLog');
const { AUDIT_ACTION_VALUES } = require('./auditActions');

/**
 * Log an audit entry (never throws — failures are swallowed)
 */
async function logAudit({
  userId,
  action,
  resource,
  changes = {},
  request = null,
  error = null,
}) {
  try {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      // Skip logging if we don't know who did it or if userId is invalid
      logger.warn(`logAudit: missing or invalid userId "${userId}", skipping`);
      return;
    }

    if (!AUDIT_ACTION_VALUES.includes(action)) {
      logger.warn(`logAudit: unregistered action "${action}" — add it to utils/auditActions.js`);
    }

    await AuditLog.create({
      userId,
      action,
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
    });
  } catch (err) {
    // Never crash the main operation because of audit logging
    logger.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
