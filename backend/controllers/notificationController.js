'use strict';

const mongoose = require('mongoose');
const logger = require('../config/logger');
const Notification = require('../Model/Notification');

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

function getUserId(user) {
  if (!user) return null;
  return user.userId || user.id || user._id || null;
}

function isObjectId(v) {
  return typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);
}

function parsePagination(q) {
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Number.parseInt(q.limit, 10) || DEFAULT_PAGE_LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

// ---------------------------------------------------------------------------
// Helper — used by other controllers to emit a notification.
// Never throws. Callers should not await (fire-and-forget).
// ---------------------------------------------------------------------------
async function createNotification({
  userId,
  type,
  title,
  message = '',
  relatedDocId = null,
  actionUrl = '',
}) {
  try {
    if (!userId || !type || !title) {
      logger.warn('[notification.create] missing required fields');
      return null;
    }
    return await Notification.create({
      userId,
      type,
      title,
      message: String(message).slice(0, 500),
      relatedDocId: relatedDocId || null,
      actionUrl: String(actionUrl).slice(0, 500),
    });
  } catch (err) {
    logger.error('[notification.create]', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /notifications
// ---------------------------------------------------------------------------
async function getNotifications(req, res) {
  try {
    const userId = getUserId(req.user);
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });

    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
    const { page, limit, skip } = parsePagination(req.query);

    const query = { userId };
    if (unreadOnly) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return res.json({
      error: false,
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('[notification.getNotifications]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /notifications/unread-count
// ---------------------------------------------------------------------------
async function getUnreadCount(req, res) {
  try {
    const userId = getUserId(req.user);
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    return res.json({ error: false, unreadCount });
  } catch (err) {
    logger.error('[notification.getUnreadCount]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /notifications/:notificationId/read
// ---------------------------------------------------------------------------
async function markAsRead(req, res) {
  try {
    const userId = getUserId(req.user);
    const { notificationId } = req.params;
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });
    if (!isObjectId(notificationId)) {
      return res.status(400).json({ error: true, message: 'Invalid notification ID' });
    }

    const doc = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ error: true, message: 'Notification not found' });
    }

    return res.json({ error: false, notification: doc });
  } catch (err) {
    logger.error('[notification.markAsRead]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /notifications/read-all
// ---------------------------------------------------------------------------
async function markAllAsRead(req, res) {
  try {
    const userId = getUserId(req.user);
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.json({ error: false, markedCount: result.modifiedCount || 0 });
  } catch (err) {
    logger.error('[notification.markAllAsRead]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /notifications/:notificationId
// ---------------------------------------------------------------------------
async function deleteNotification(req, res) {
  try {
    const userId = getUserId(req.user);
    const { notificationId } = req.params;
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });
    if (!isObjectId(notificationId)) {
      return res.status(400).json({ error: true, message: 'Invalid notification ID' });
    }

    const result = await Notification.deleteOne({ _id: notificationId, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: true, message: 'Notification not found' });
    }

    return res.json({ error: false, message: 'Deleted' });
  } catch (err) {
    logger.error('[notification.deleteNotification]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};