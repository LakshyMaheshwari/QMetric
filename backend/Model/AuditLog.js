const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  },
  actorType: {
    type: String,
    enum: ['user', 'admin_secret', 'system'],
    default: 'user',
    index: true,
  },
  // Free-form String on purpose: see utils/auditActions.js. A Mongoose enum here
  // silently dropped every audit write whose action wasn't listed.
  action: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  resource: {
    type: String, // Format: "Model:ID" e.g., "User:123abc"
    required: true,
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  changes: {
    type: [String], // ["field1", "field2"] - which fields changed
    default: [],
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS',
  },
  ipAddress: String,
  userAgent: String,
  error: String, // If status is FAILED
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });

// TTL: auto-delete after AUDIT_LOG_TTL_DAYS (default 730 = 2 years)
// Consistent with OCRLog (90 days) and Notification (90 days) expiry patterns.
const AUDIT_TTL_SECONDS = parseInt(process.env.AUDIT_LOG_TTL_DAYS || '730', 10) * 24 * 60 * 60;
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: AUDIT_TTL_SECONDS }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
