const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  createNotificationRoute,
} = require('../controllers/notificationController');

router.get('/', protect, getNotifications);
router.post('/', protect, createNotificationRoute);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);
router.delete('/clear', protect, clearNotifications);

module.exports = router;
