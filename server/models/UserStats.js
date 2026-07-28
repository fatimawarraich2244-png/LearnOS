const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    badges: {
      type: [String],
      default: [],
    },
    weeklyGoalDays: {
      type: Number,
      default: 5,
    },
    weekStartDate: {
      type: Date,
      default: null,
    },
    daysStudiedThisWeek: {
      type: [String],
      default: [],
    },
    learningDNA: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserStats', userStatsSchema);
