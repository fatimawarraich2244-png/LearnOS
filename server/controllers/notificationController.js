const Notification = require('../models/Notification');
const UserStats = require('../models/UserStats');
const Subject = require('../models/Subject');

// Helper function to create notification internally
const createNotificationHelper = async (userId, type, title, message) => {
  try {
    const notif = await Notification.create({
      userId,
      type,
      title,
      message,
    });
    console.log('[DEBUG Handoff 1 Notification Saved to DB]', notif);
    return notif;
  } catch (error) {
    console.error('Error creating notification helper:', error.message);
  }
};

// Generate tailored motivational message
const generateMotivationalMessage = (stats, subjects) => {
  const weakTopics = subjects ? subjects.flatMap((s) => s.weakTopics || []) : [];
  const streak = stats?.currentStreak || 0;
  const xp = stats?.xp || 0;
  const level = stats?.level || 1;

  const quotes = [
    {
      title: 'Daily Study Motivation 💡',
      message: 'Small consistent study steps today lead to confidence on exam day. Keep going!',
    },
    {
      title: 'Knowledge Builder 🧠',
      message: 'Every quiz question answered builds neural pathways. Challenge yourself today!',
    },
    {
      title: 'Stay Consistent 🚀',
      message: "Excellence isn't an act, it's a daily study habit. Make today count!",
    },
  ];

  if (weakTopics.length > 0) {
    const targetTopic = weakTopics[Math.floor(Math.random() * weakTopics.length)];
    return {
      title: 'Focus Target 🎯',
      message: `Targeting your weak topic "${targetTopic}" today will yield huge score gains on your next quiz!`,
    };
  }

  if (streak >= 2) {
    return {
      title: 'Streak Fire 🔥',
      message: `You are on a ${streak}-day study streak! Don't break the chain today!`,
    };
  }

  if (xp > 0) {
    const nextLevelXP = level * 100;
    const needed = Math.max(0, nextLevelXP - xp);
    return {
      title: 'Level Up Goal ⚡',
      message: `You are ${needed} XP away from Level ${level + 1}! Take a quick practice quiz to level up.`,
    };
  }

  return quotes[Math.floor(Math.random() * quotes.length)];
};

// ── @desc   Get all notifications for logged-in user (triggers daily motivational check)
// ── @route  GET /api/notifications
// ── @access Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    // Check if daily motivational notification exists for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existingDailyMotiv = await Notification.findOne({
      userId,
      type: 'motivational',
      createdAt: { $gte: startOfToday },
    });

    if (!existingDailyMotiv) {
      const stats = await UserStats.findOne({ userId });
      const subjects = await Subject.find({ userId });
      const motiv = generateMotivationalMessage(stats, subjects);
      await createNotificationHelper(userId, 'motivational', motiv.title, motiv.message);
    }

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    console.log('[DEBUG Handoff 2 Server Sending Notifications to Frontend]', {
      userId,
      count: notifications.length,
    });

    return res.json(notifications);
  } catch (error) {
    console.error('Error in getNotifications:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Mark single notification as read
// ── @route  PATCH /api/notifications/:id/read
// ── @access Private
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json(notif);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Mark all notifications as read
// ── @route  PATCH /api/notifications/read-all
// ── @access Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );

    const updated = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Clear/delete all notifications for logged-in user
// ── @route  DELETE /api/notifications/clear
// ── @access Private
const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    return res.json({ message: 'All notifications cleared', notifications: [] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Create notification (POST /api/notifications)
// ── @route  POST /api/notifications
// ── @access Private
const createNotificationRoute = async (req, res) => {
  try {
    const { type, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const notif = await createNotificationHelper(req.userId, type || 'system', title, message);
    return res.status(201).json(notif);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  createNotificationRoute,
  createNotificationHelper,
};
