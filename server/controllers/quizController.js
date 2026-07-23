const axios = require('axios');
const Material = require('../models/Material');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');

// ── @desc   Generate multiple choice quiz questions for a subject
// ── @route  POST /api/quiz/generate
// ── @access Private
const generateQuiz = async (req, res) => {
  try {
    const { subjectId, difficulty = 'medium' } = req.body;

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
    materials.forEach((mat) => {
      if (mat.chunks && mat.chunks.length > 0) {
        allChunks = allChunks.concat(mat.chunks);
      }
    });

    if (allChunks.length === 0) {
      return res.status(400).json({ message: 'Study materials contain no text content to generate a quiz.' });
    }

    const combinedText = allChunks.join('\n\n').slice(0, 8000);

    const systemPrompt = `You are an expert educational quiz generator. Generate 5 multiple-choice questions based ONLY on the provided study materials. The quiz difficulty must be: ${difficulty}.
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

// ── @desc   Submit quiz answers, calculate score, save to DB, and update subject weak/strong topics
// ── @route  POST /api/quiz/submit
// ── @access Private
const submitQuiz = async (req, res) => {
  try {
    const { subjectId, questions, userAnswers, difficulty = 'medium' } = req.body;

    if (!subjectId || !questions || !Array.isArray(questions) || !userAnswers || !Array.isArray(userAnswers)) {
      return res.status(400).json({ message: 'subjectId, questions, and userAnswers are required' });
    }

    let correctCount = 0;
    const totalQuestions = questions.length;

    const results = questions.map((q, index) => {
      const userAnswer = userAnswers[index] || '';
      const isCorrect = userAnswer === q.correctAnswer;
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

    const newQuiz = await Quiz.create({
      subjectId,
      userId: req.userId,
      questions,
      score,
      difficulty,
    });

    const subject = await Subject.findById(subjectId);
    if (subject) {
      const topicName = subject.name;
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

    return res.json({
      score,
      quizId: newQuiz._id,
      correctCount,
      totalQuestions,
      results,
    });
  } catch (error) {
    console.error('Error in submitQuiz:', error.message);
    return res.status(500).json({ message: `Error submitting quiz: ${error.message}` });
  }
};

module.exports = { generateQuiz, submitQuiz };
