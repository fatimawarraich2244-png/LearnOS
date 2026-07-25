const UserStats = require('../models/UserStats');

/**
 * Adds XP to user stats, recalculates level, and saves.
 */
const addXP = async (userId, amount) => {
  try {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = await UserStats.create({ userId });
    }

    const oldLevel = stats.level || 1;
    stats.xp = (stats.xp || 0) + amount;
    const newLevel = Math.floor(stats.xp / 100) + 1;
    const leveledUp = newLevel > oldLevel;

    stats.level = newLevel;
    await stats.save();

    return {
      newXP: stats.xp,
      newLevel,
      leveledUp,
      oldLevel,
    };
  } catch (error) {
    console.error('Error in addXP service:', error.message);
    return { newXP: 0, newLevel: 1, leveledUp: false };
  }
};

/**
 * Updates user study streak based on lastActiveDate calendar days.
 */
const updateStreak = async (userId) => {
  try {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = await UserStats.create({ userId });
    }

    const now = new Date();
    let streakBroken = false;

    if (!stats.lastActiveDate) {
      stats.currentStreak = 1;
    } else {
      const last = new Date(stats.lastActiveDate);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastStart = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      const diffTime = todayStart.getTime() - lastStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, streak stays the same
      } else if (diffDays === 1) {
        // Yesterday, increment streak
        stats.currentStreak = (stats.currentStreak || 0) + 1;
      } else {
        // More than 1 day, reset streak
        stats.currentStreak = 1;
        streakBroken = true;
      }
    }

    stats.lastActiveDate = now;
    if (stats.currentStreak > (stats.longestStreak || 0)) {
      stats.longestStreak = stats.currentStreak;
    }

    await stats.save();

    return {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      streakBroken,
    };
  } catch (error) {
    console.error('Error in updateStreak service:', error.message);
    return { currentStreak: 1, longestStreak: 1, streakBroken: false };
  }
};

/**
 * Checks and awards badges to user based on context stats.
 */
const checkAndAwardBadges = async (userId, context = {}) => {
  try {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = await UserStats.create({ userId });
    }

    const newlyEarned = [];
    const existingBadges = stats.badges || [];

    const maybeAward = (badgeId, isEarned) => {
      if (isEarned && !existingBadges.includes(badgeId) && !newlyEarned.includes(badgeId)) {
        newlyEarned.push(badgeId);
      }
    };

    const hour = new Date().getHours();

    maybeAward('first_quiz', typeof context.quizzesTaken === 'number' && context.quizzesTaken >= 1);
    maybeAward('quiz_master', typeof context.quizzesTaken === 'number' && context.quizzesTaken >= 10);
    maybeAward('week_streak', (stats.currentStreak || 0) >= 7 || (typeof context.currentStreak === 'number' && context.currentStreak >= 7));
    maybeAward('knowledge_seeker', (typeof context.knowledgeMapsGenerated === 'number' && context.knowledgeMapsGenerated >= 3) || (typeof context.subjectsCount === 'number' && context.subjectsCount >= 3));
    maybeAward('perfect_score', context.score === 100);
    maybeAward('night_owl', hour >= 22 || hour < 4);

    if (newlyEarned.length > 0) {
      stats.badges = Array.from(new Set([...existingBadges, ...newlyEarned]));
      await stats.save();
    }

    return newlyEarned;
  } catch (error) {
    console.error('Error in checkAndAwardBadges service:', error.message);
    return [];
  }
};

module.exports = {
  addXP,
  updateStreak,
  checkAndAwardBadges,
};
