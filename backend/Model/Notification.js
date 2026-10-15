const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
  type: String,
  enum: [
    // Existing
    'paper_submitted',
    'review_needed',
    'paper_approved',
    'paper_rejected',
    'revision_needed',
    'paper_assigned',
    'user_created',
    'welcome',
    'ocr_flagged',
    'system',

    // User Model Redesign
    'pending_teacher_approval',
    'teacher_approved',
    'teacher_rejected',
    'welcome_pending_approval',
    'affiliation_requested',
  ],
  required: true,
},
    title:   { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    relatedDocId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actionUrl: { type: String, default: '' },
    isRead:    { type: Boolean, default: false, index: true },
    readAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

// List query: user's notifications, newest first
notificationSchema.index({ userId: 1, createdAt: -1 });

// Unread count query
notificationSchema.index({ userId: 1, isRead: 1 });

// TTL: auto-delete after 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model('Notification', notificationSchema);