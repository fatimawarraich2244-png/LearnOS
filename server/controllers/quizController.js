const mongoose = require('mongoose');
const axios = require('axios');
const Material = require('../models/Material');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const { getEmbeddings } = require('../services/embeddings');
const { cosineSimilarity } = require('../services/similarity');

// ── Fix 4 (XSS): Strip HTML tags before saving topic to DB.
// Mirrors sanitizeName() already used in semester/subject/exam controllers.
const sanitizeName = (str) => (str ? str.replace(/<[^>]*>/g, '').trim() : '');

// ── @desc   Generate multiple choice quiz questions for a subject
// ── @route  POST /api/quiz/generate
// ── @access Private
const generateQuiz = async (req, res) => {
  try {
    const { subjectId, difficulty = 'medium', topic } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required' });
    }

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
    });

    if (!materials || materials.length === 0) {
      return res.status(400).json({ message: 'No study materials found for this subject to generate a quiz.' });
    }

    let allChunks = [];
    let allEmbeddings = [];

    materials.forEach((mat) => {
      if (mat.chunks && mat.chunks.length > 0) {
        allChunks = allChunks.concat(mat.chunks);
        if (mat.embeddings && mat.chunks.length === mat.embeddings.length) {
          allEmbeddings = allEmbeddings.concat(mat.embeddings);
        }
      }
    });

    if (allChunks.length === 0) {
      return res.status(400).json({ message: 'Study materials contain no text content to generate a quiz.' });
    }

    let combinedText = '';
    const hasTopic = typeof topic === 'string' && topic.trim().length > 0;

    if (hasTopic) {
      const topicEmbeddings = await getEmbeddings([topic.trim()]);
      const topicVector = topicEmbeddings[0];

      if (topicVector && allEmbeddings.length > 0 && allChunks.length === allEmbeddings.length) {
        const scoredChunks = allChunks.map((chunk, index) => {
          const score = cosineSimilarity(topicVector, allEmbeddings[index]);
          return { chunk, score };
        });
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, 8).map((sc) => sc.chunk);
        combinedText = topChunks.join('\n\n');
      } else {
        combinedText = allChunks.slice(0, 8).join('\n\n');
      }
    } else {
      combinedText = allChunks.join('\n\n').slice(0, 8000);
    }

    const topicInstruction = hasTopic ? `specifically about: ${topic.trim()}` : 'based ONLY on the provided study materials';
    const systemPrompt = `You are an expert educational quiz generator. Generate 5 multiple-choice questions ${topicInstruction}. The quiz difficulty must be: ${difficulty}.
You MUST respond ONLY with a single valid JSON object. Do not include any explanations, introduction, or text outside of the raw JSON object.

JSON structure required:
{
  "questions": [
    {
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact string matching one of the options",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}`;

    const userPrompt = `Study Material:\n${combinedText}\n\nGenerate the 5 multiple choice questions in JSON format now.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let rawContent = response.data?.choices?.[0]?.message?.content || '';

    // Strip markdown code block fences if present (e.g. ```json ... ```)
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Groq quiz JSON output:', rawContent);
      return res.status(500).json({
        message: 'Failed to parse generated quiz data. Please try again.',
        error: parseErr.message,
      });
    }

    const questions = parsedData.questions || parsedData;

    return res.json({ questions });
  } catch (error) {
    console.error('Error in generateQuiz:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error generating quiz: ${error.message}` });
  }
};

// ── @desc   Generate multiple choice exam questions for a subject (15 questions, timed)
// ── @route  POST /api/quiz/generate-exam
// ── @access Private
const generateExam = async (req, res) => {
  try {
    const { subjectId, difficulty = 'medium', topic } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required' });
    }

    const materials = await Material.find({
      subjectId,
      userId: req.userId,
    });

    if (!materials || materials.length === 0) {
      return res.status(400).json({ message: 'No study materials found for this subject to generate an exam.' });
    }

    let allChunks = [];
    let allEmbeddings = [];

    materials.forEach((mat) => {
      if (mat.chunks && mat.chunks.length > 0) {
        allChunks = allChunks.concat(mat.chunks);
        if (mat.embeddings && mat.chunks.length === mat.embeddings.length) {
          allEmbeddings = allEmbeddings.concat(mat.embeddings);
        }
      }
    });

    if (allChunks.length === 0) {
      return res.status(400).json({ message: 'Study materials contain no text content to generate an exam.' });
    }

    let combinedText = '';
    const hasTopic = typeof topic === 'string' && topic.trim().length > 0;

    if (hasTopic) {
      const topicEmbeddings = await getEmbeddings([topic.trim()]);
      const topicVector = topicEmbeddings[0];

      if (topicVector && allEmbeddings.length > 0 && allChunks.length === allEmbeddings.length) {
        const scoredChunks = allChunks.map((chunk, index) => {
          const score = cosineSimilarity(topicVector, allEmbeddings[index]);
          return { chunk, score };
        });
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, 8).map((sc) => sc.chunk);
        combinedText = topChunks.join('\n\n');
      } else {
        combinedText = allChunks.slice(0, 8).join('\n\n');
      }
    } else {
      combinedText = allChunks.join('\n\n').slice(0, 8000);
    }

    const topicInstruction = hasTopic ? `specifically about: ${topic.trim()}` : 'covering a broad range of topics from the material';
    const systemPrompt = `You are an expert educational exam generator. Generate 15 multiple-choice questions ${topicInstruction}, based ONLY on the provided study materials. The exam difficulty must be: ${difficulty}.
You MUST respond ONLY with a single valid JSON object. Do not include any explanations, introduction, or text outside of the raw JSON object.

JSON structure required:
{
  "questions": [
    {
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact string matching one of the options",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}`;

    const userPrompt = `Study Material:\n${combinedText}\n\nGenerate the 15 multiple choice questions in JSON format now.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let rawContent = response.data?.choices?.[0]?.message?.content || '';

    // Strip markdown code block fences if present (e.g. ```json ... ```)
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Groq exam JSON output:', rawContent);
      return res.status(500).json({
        message: 'Failed to parse generated exam data. Please try again.',
        error: parseErr.message,
      });
    }

    const questions = parsedData.questions || parsedData;

    return res.json({ questions, examMode: true, timeLimit: 20 });
  } catch (error) {
    console.error('Error in generateExam:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error generating exam: ${error.message}` });
  }
};

// ── @desc   Submit quiz answers, calculate score, save to DB, and update subject weak/strong topics
// ── @route  POST /api/quiz/submit
// ── @access Private
const submitQuiz = async (req, res) => {
  try {
    const rawUserAnswers = req.body.userAnswers || req.body.answers || [];
    const { subjectId, questions, difficulty = 'medium', examMode = false, timeTakenSeconds = 0, topic = '' } = req.body;

    console.log('[DEBUG Handoff 2 Controller submitQuiz Received]', {
      userId: req.userId,
      subjectId,
      questionsCount: questions?.length,
      userAnswersCount: rawUserAnswers?.length,
      rawUserAnswers,
    });

    if (!subjectId || !questions || !Array.isArray(questions) || !Array.isArray(rawUserAnswers)) {
      return res.status(400).json({ message: 'subjectId, questions, and userAnswers (or answers) are required array fields' });
    }

    // Fix 1 (Q2b): reject non-ObjectId subjectId with a clean 400 instead of a raw Mongoose 500
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subjectId format' });
    }

    // Fix 2 (Q2c): confirm the subject exists and belongs to this user
    const subject = await Subject.findOne({ _id: subjectId, userId: req.userId });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found or does not belong to you' });
    }

    // Fix 3 (Q3b): reject empty quiz submissions — at least one question is required
    if (questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must contain at least one question.' });
    }

    let correctCount = 0;
    const totalQuestions = questions.length;

    const results = questions.map((q, index) => {
      const userAnswer = rawUserAnswers[index] || '';
      const isCorrect = userAnswer.trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
      if (isCorrect) {
        correctCount += 1;
      }
      return {
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const questionsToSave = questions.map((q, index) => ({
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      userAnswer: rawUserAnswers[index] || '',
      explanation: q.explanation || '',
    }));

    console.log('[DEBUG Handoff 3 Controller Saving to DB]', {
      score,
      correctCount,
      totalQuestions,
      questionsToSave,
    });

    const newQuiz = await Quiz.create({
      subjectId,
      userId: req.userId,
      questions: questionsToSave,
      score,
      difficulty,
      examMode: Boolean(examMode),
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      // Fix 4 (Q4): sanitize topic before saving — strips any HTML/script tags
      topic: sanitizeName(topic),
    });

    // subject was already fetched above for the ownership check — reuse it
    const subjectForTopics = subject;

    if (subjectForTopics) {
      const topicName = subjectForTopics.name;
      if (score < 50) {
        await Subject.findByIdAndUpdate(subjectId, {
          $addToSet: { weakTopics: topicName },
          $pull: { strongTopics: topicName },
        });
      } else if (score >= 80) {
        await Subject.findByIdAndUpdate(subjectId, {
          $addToSet: { strongTopics: topicName },
          $pull: { weakTopics: topicName },
        });
      }
    }

    // Gamification Integration
    const { addXP, updateStreak, updateWeeklyProgress, checkAndAwardBadges } = require('../services/gamification');
    const xpAmount = score >= 80 ? 50 : 20;
    const xpResult = await addXP(req.userId, xpAmount);
    const streakResult = await updateStreak(req.userId);
    await updateWeeklyProgress(req.userId);

    const quizzesTaken = await Quiz.countDocuments({ userId: req.userId });
    const newBadges = await checkAndAwardBadges(req.userId, {
      quizzesTaken,
      score,
      currentStreak: streakResult.currentStreak,
    });

    const { createNotificationHelper } = require('./notificationController');
    const notifType = examMode ? 'exam' : 'quiz';
    const notifTitle = examMode ? '📝 Timed Exam Completed' : '📊 Practice Quiz Completed';
    const notifMsg = `You scored ${score}% (${correctCount}/${totalQuestions} correct) and earned +${xpAmount} XP!`;
    await createNotificationHelper(req.userId, notifType, notifTitle, notifMsg);

    return res.json({
      score,
      quizId: newQuiz._id,
      correctCount,
      totalQuestions,
      results,
      xpAdded: xpAmount,
      newXP: xpResult.newXP,
      newLevel: xpResult.newLevel,
      leveledUp: xpResult.leveledUp,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      newBadges,
    });
  } catch (error) {
    console.error('Error in submitQuiz:', error.message);
    return res.status(500).json({ message: `Error submitting quiz: ${error.message}` });
  }
};

// ── @desc   Get all quiz attempt history for a subject
// ── @route  GET /api/quiz/history/:subjectId
// ── @access Private
const getQuizHistory = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const history = await Quiz.find({
      subjectId,
      userId: req.userId,
    }).sort({ takenAt: -1, createdAt: -1 });

    console.log('[DEBUG Handoff 4 Controller getQuizHistory Read]', history.map((q) => ({
      quizId: q._id,
      score: q.score,
      questions: q.questions.map((item) => ({ q: item.question, userAns: item.userAnswer, correctAns: item.correctAnswer })),
    })));

    return res.json(history);
  } catch (error) {
    console.error('Error in getQuizHistory:', error.message);
    return res.status(500).json({ message: `Error fetching quiz history: ${error.message}` });
  }
};

// ── @desc   Get all quiz attempt history across ALL subjects for user
// ── @route  GET /api/quiz/history-all
// ── @access Private
const getAllQuizHistory = async (req, res) => {
  try {
    const history = await Quiz.find({ userId: req.userId })
      .populate('subjectId', 'name')
      .sort({ takenAt: -1, createdAt: -1 });

    console.log('[DEBUG Handoff 4 Controller getAllQuizHistory Read]', history.map((q) => ({
      quizId: q._id,
      score: q.score,
      questions: q.questions.map((item) => ({ q: item.question, userAns: item.userAnswer, correctAns: item.correctAnswer })),
    })));

    return res.json(history);
  } catch (error) {
    console.error('Error in getAllQuizHistory:', error.message);
    return res.status(500).json({ message: `Error fetching all quiz history: ${error.message}` });
  }
};

module.exports = { generateQuiz, generateExam, submitQuiz, getQuizHistory, getAllQuizHistory };
