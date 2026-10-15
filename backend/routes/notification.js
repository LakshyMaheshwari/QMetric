const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const notificationController = require('../controllers/notificationController');
const { validatePagination, handleValidationErrors } = require('../middleware/validators');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification center
 */

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications for the current user
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: List of notifications with unreadCount }
 */
router.get('/', validatePagination, handleValidationErrors, notificationController.getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count (for badge)
 *     tags: [Notifications]
 *     responses:
 *       200: { description: { error: false, unreadCount: N } }
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200: { description: { error: false, markedCount: N } }
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification updated }
 *       404: { description: Not found }
 */
router.put('/:notificationId/read', notificationController.markAsRead);

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;