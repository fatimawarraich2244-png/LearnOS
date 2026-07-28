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

      const { createNotificationHelper } = require('../controllers/notificationController');
      const badgeNamesMap = {
        first_quiz: 'First Steps',
        quiz_master: 'Quiz Master',
        week_streak: 'Week Warrior',
        knowledge_seeker: 'Knowledge Seeker',
        perfect_score: 'Perfectionist',
        night_owl: 'Night Owl',
      };
      for (const bId of newlyEarned) {
        const name = badgeNamesMap[bId] || bId;
        await createNotificationHelper(userId, 'badge', '🏆 Badge Unlocked!', `Congratulations! You unlocked the "${name}" badge.`);
      }
    }

    return newlyEarned;
  } catch (error) {
    console.error('Error in checkAndAwardBadges service:', error.message);
    return [];
  }
};

/**
 * Helper to calculate the date of the most recent Monday (00:00:00).
 */
const getMostRecentMonday = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Updates user weekly study progress.
 */
const updateWeeklyProgress = async (userId) => {
  try {
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = await UserStats.create({ userId });
    }

    const now = new Date();
    const currentMonday = getMostRecentMonday(now);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${dayStr}`;

    // Reset if new week
    if (!stats.weekStartDate || new Date(stats.weekStartDate).getTime() < currentMonday.getTime()) {
      stats.weekStartDate = currentMonday;
      stats.daysStudiedThisWeek = [todayStr];
    } else {
      if (!stats.daysStudiedThisWeek.includes(todayStr)) {
        stats.daysStudiedThisWeek.push(todayStr);
      }
    }

    await stats.save();
    return {
      weeklyGoalDays: stats.weeklyGoalDays || 5,
      daysStudiedThisWeek: stats.daysStudiedThisWeek,
    };
  } catch (error) {
    console.error('Error in updateWeeklyProgress service:', error.message);
    return { weeklyGoalDays: 5, daysStudiedThisWeek: [] };
  }
};

module.exports = {
  addXP,
  updateStreak,
  updateWeeklyProgress,
  checkAndAwardBadges,
};
