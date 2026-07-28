const UserStats = require('../models/UserStats');
const { sanitizeObjectStrings } = require('../utils/sanitize');

// ── @desc   Get gamification stats for logged-in user
// ── @route  GET /api/stats
// ── @access Private
const getUserStats = async (req, res) => {
  try {
    const { updateWeeklyProgress } = require('../services/gamification');
    let stats = await UserStats.findOne({ userId: req.userId });

    if (!stats) {
      stats = await UserStats.create({ userId: req.userId });
    }

    await updateWeeklyProgress(req.userId);
    stats = await UserStats.findOne({ userId: req.userId });

    console.log('[DEBUG getUserStats] req.userId:', req.userId);
    console.log('[DEBUG getUserStats] stats:', stats);

    return res.json(stats);
  } catch (error) {
    console.error('Error in getUserStats controller:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Update user weekly goal days
// ── @route  PUT /api/stats/weekly-goal
// ── @access Private
const updateWeeklyGoal = async (req, res) => {
  try {
    const { weeklyGoalDays } = req.body;
    const goal = Number(weeklyGoalDays);

    if (isNaN(goal) || goal < 1 || goal > 7) {
      return res.status(400).json({ message: 'weeklyGoalDays must be a number between 1 and 7' });
    }

    let stats = await UserStats.findOne({ userId: req.userId });
    if (!stats) {
      stats = await UserStats.create({ userId: req.userId });
    }

    stats.weeklyGoalDays = goal;
    await stats.save();

    return res.json(stats);
  } catch (error) {
    console.error('Error in updateWeeklyGoal controller:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Analyze learning patterns (Learning DNA) using Groq AI
// ── @route  POST /api/stats/learning-dna
// ── @access Private
const analyzeLearningDNA = async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const ChatMessage = require('../models/ChatMessage');
    const axios = require('axios');

    const quizzes = await Quiz.find({ userId: req.userId }).sort({ takenAt: 1, createdAt: 1 });
    const chats = await ChatMessage.find({ userId: req.userId, role: 'user' }).sort({ createdAt: 1 });

    const totalDataPoints = quizzes.length + chats.length;

    if (totalDataPoints < 5) {
      return res.json({
        message: 'Keep studying — Learning DNA needs at least 5 study sessions to detect patterns.',
        learningDNA: null,
      });
    }

    const timeBuckets = {
      morning: { count: 0, totalScore: 0, avgScore: 0 },
      afternoon: { count: 0, totalScore: 0, avgScore: 0 },
      evening: { count: 0, totalScore: 0, avgScore: 0 },
      night: { count: 0, totalScore: 0, avgScore: 0 },
    };

    quizzes.forEach((q) => {
      const date = new Date(q.takenAt || q.createdAt);
      const hour = date.getHours();
      let bucket = 'night';
      if (hour >= 6 && hour < 12) bucket = 'morning';
      else if (hour >= 12 && hour < 17) bucket = 'afternoon';
      else if (hour >= 17 && hour < 21) bucket = 'evening';

      timeBuckets[bucket].count += 1;
      timeBuckets[bucket].totalScore += q.score || 0;
    });

    Object.keys(timeBuckets).forEach((key) => {
      const b = timeBuckets[key];
      if (b.count > 0) {
        b.avgScore = Math.round(b.totalScore / b.count);
      }
    });

    let quizzesAfterExplain = 0;
    let totalScoreAfterExplain = 0;
    let quizzesWithoutExplain = 0;
    let totalScoreWithoutExplain = 0;

    quizzes.forEach((q) => {
      const qDate = new Date(q.takenAt || q.createdAt).getTime();
      const hadExplainBefore = chats.some((c) => {
        const cDate = new Date(c.createdAt).getTime();
        const isWithin24h = qDate >= cDate && qDate - cDate <= 24 * 60 * 60 * 1000;
        const contentLower = (c.content || '').toLowerCase();
        const isExplain =
          contentLower.includes('explain') ||
          contentLower.includes('eli6') ||
          contentLower.includes('highschool') ||
          contentLower.includes('university') ||
          contentLower.includes('exam') ||
          contentLower.includes('interview');
        return isWithin24h && isExplain;
      });

      if (hadExplainBefore) {
        quizzesAfterExplain += 1;
        totalScoreAfterExplain += q.score || 0;
      } else {
        quizzesWithoutExplain += 1;
        totalScoreWithoutExplain += q.score || 0;
      }
    });

    const avgScoreAfterExplain = quizzesAfterExplain > 0 ? Math.round(totalScoreAfterExplain / quizzesAfterExplain) : 0;
    const avgScoreWithoutExplain = quizzesWithoutExplain > 0 ? Math.round(totalScoreWithoutExplain / quizzesWithoutExplain) : 0;

    let feynmanQuizzes = 0;
    let feynmanTotalScore = 0;

    quizzes.forEach((q) => {
      const qDate = new Date(q.takenAt || q.createdAt).getTime();
      const hadFeynmanBefore = chats.some((c) => {
        const cDate = new Date(c.createdAt).getTime();
        const sameSubject = c.subjectId && q.subjectId && c.subjectId.toString() === q.subjectId.toString();
        const isBefore = qDate >= cDate;
        const contentLower = (c.content || '').toLowerCase();
        const isFeynman = contentLower.includes('teaching:') || contentLower.includes('feynman');
        return sameSubject && isBefore && isFeynman;
      });

      if (hadFeynmanBefore) {
        feynmanQuizzes += 1;
        feynmanTotalScore += q.score || 0;
      }
    });

    const avgScoreAfterFeynman = feynmanQuizzes > 0 ? Math.round(feynmanTotalScore / feynmanQuizzes) : 0;

    const aggregatedSummary = {
      totalQuizzes: quizzes.length,
      totalChats: chats.length,
      timeBuckets,
      explainCorrelation: {
        quizzesAfterExplain,
        avgScoreAfterExplain,
        quizzesWithoutExplain,
        avgScoreWithoutExplain,
      },
      feynmanCorrelation: {
        feynmanQuizzes,
        avgScoreAfterFeynman,
      },
    };

    const systemPrompt = `You are a diagnostic learning analytics assistant for an educational platform.
Analyze the student's study summary data below and identify 2 to 4 genuine behavioral patterns or insights in plain, encouraging language (e.g. "You tend to score higher on quizzes taken in the evening").

Requirements:
1. Respond ONLY in valid JSON format:
{
  "patterns": [
    {
      "insight": "string",
      "confidence": "high" | "medium",
      "category": "time" | "technique" | "engagement"
    }
  ]
}
2. Only include patterns where there is a meaningful difference in the data (at least 15% score difference or a clear count-based pattern).
3. If data is too sparse or uniform to deduce clear patterns, return an empty array for patterns.`;

    const userPrompt = `Student Activity Aggregated Data:\n${JSON.stringify(aggregatedSummary, null, 2)}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let rawContent = response.data?.choices?.[0]?.message?.content || '';
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsedData = { patterns: [] };
    try {
      parsedData = JSON.parse(rawContent);
      parsedData = sanitizeObjectStrings(parsedData);
    } catch (parseErr) {
      console.error('Failed to parse Groq Learning DNA output:', rawContent);
    }

    const learningDNAResult = {
      patterns: parsedData.patterns || [],
      dataPoints: totalDataPoints,
      lastAnalyzed: new Date(),
    };

    let userStats = await UserStats.findOne({ userId: req.userId });
    if (!userStats) {
      userStats = await UserStats.create({ userId: req.userId });
    }

    userStats.learningDNA = learningDNAResult;
    await userStats.save();

    return res.json({ learningDNA: learningDNAResult });
  } catch (error) {
    console.error('Error in analyzeLearningDNA:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserStats,
  updateWeeklyGoal,
  analyzeLearningDNA,
};
