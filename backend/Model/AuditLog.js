const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CREATE_ACCOUNT',
      'UPDATE_PROFILE',
      'CREATE_USER',
      'UPDATE_ROLE',
      'BLOCK_USER',
      'UNBLOCK_USER',
      'DELETE_USER',
      'UPLOAD_PAPER',
      'REVIEW_PAPER',
      'APPROVE_PAPER',
      'REJECT_PAPER',
      'CREATE_COLLEGE',
      'UPDATE_COLLEGE',
      'DELETE_COLLEGE',
      'CREATE_ADMIN',
    ],
    required: true,
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
    index: true,
  },
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
