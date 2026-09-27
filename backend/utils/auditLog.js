const AuditLog = require('../Model/AuditLog');

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
    if (!userId) {
      // Skip logging if we don't know who did it
      console.warn('logAudit: no userId provided, skipping');
      return;
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
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
