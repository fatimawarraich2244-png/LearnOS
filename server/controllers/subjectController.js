const axios = require('axios');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const Material = require('../models/Material');

// ── @desc   Get all subjects for a semester
// ── @route  GET /api/subjects/:semesterId
// ── @access Private
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({
      semesterId: req.params.semesterId,
      userId: req.userId,
    });
    return res.json(subjects);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Create a new subject
// ── @route  POST /api/subjects
// ── @access Private
const createSubject = async (req, res) => {
  try {
    const { name, semesterId } = req.body;

    if (!name || !semesterId) {
      return res.status(400).json({ message: 'Name and semesterId are required' });
    }

    const subject = await Subject.create({ name, semesterId, userId: req.userId });
    return res.status(201).json(subject);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Delete a subject by ID
// ── @route  DELETE /api/subjects/:id
// ── @access Private
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await subject.deleteOne();
    return res.json({ message: 'Subject deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get subject by ID
// ── @route  GET /api/subjects/single/:id
// ── @access Private
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    return res.json(subject);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Update a subject by ID
// ── @route  PUT /api/subjects/:id
// ── @access Private
const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { weakTopics, strongTopics, studyTimeMinutes } = req.body;
    if (weakTopics !== undefined) subject.weakTopics = weakTopics;
    if (strongTopics !== undefined) subject.strongTopics = strongTopics;
    if (studyTimeMinutes !== undefined) subject.studyTimeMinutes = studyTimeMinutes;

    await subject.save();
    return res.json(subject);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get aggregated dashboard stats
// ── @route  GET /api/subjects/stats/overview
// ── @access Private
const getDashboardStats = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.userId });
    const quizzes = await Quiz.find({ userId: req.userId }).sort({ takenAt: -1, createdAt: -1 });

    let overallProgress = 0;
    if (quizzes.length > 0) {
      const totalScore = quizzes.reduce((sum, q) => sum + (q.score || 0), 0);
      overallProgress = Math.round(totalScore / quizzes.length);
    }

    const totalStudyTimeMinutes = subjects.reduce((sum, s) => sum + (s.studyTimeMinutes || 0), 0);

    const weakSubjects = subjects
      .filter((s) => s.weakTopics && s.weakTopics.length > 0)
      .map((s) => {
        const latestQuiz = quizzes.find((q) => q.subjectId.toString() === s._id.toString());
        return {
          subjectId: s._id,
          name: s.name,
          weakTopics: s.weakTopics,
          latestScore: latestQuiz ? latestQuiz.score : 0,
        };
      });

    const examReadiness = overallProgress;

    return res.json({
      overallProgress,
      totalStudyTimeMinutes,
      weakSubjects,
      examReadiness,
      totalSubjects: subjects.length,
      totalQuizzesTaken: quizzes.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Log study time minutes for a subject
// ── @route  POST /api/subjects/:id/log-time
// ── @access Private
const logStudyTime = async (req, res) => {
  try {
    const { minutes } = req.body;

    if (typeof minutes !== 'number' || minutes <= 0 || isNaN(minutes)) {
      return res.status(400).json({ message: 'Invalid minutes value' });
    }

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      { $inc: { studyTimeMinutes: minutes } },
      { new: true }
    );

    return res.json(updatedSubject);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Generate AI knowledge map for a subject based on uploaded materials
// ── @route  POST /api/subjects/:id/knowledge-map
// ── @access Private
const generateKnowledgeMap = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const materials = await Material.find({
      subjectId: req.params.id,
      userId: req.userId,
    });

    if (!materials || materials.length === 0) {
      return res.status(400).json({ message: 'No study materials found for this subject to generate a knowledge map.' });
    }

    let allChunks = [];
    materials.forEach((mat) => {
      if (mat.chunks && mat.chunks.length > 0) {
        allChunks = allChunks.concat(mat.chunks);
      }
    });

    if (allChunks.length === 0) {
      return res.status(400).json({ message: 'Study materials contain no text content to generate a knowledge map.' });
    }

    const combinedText = allChunks.join('\n\n').slice(0, 6000);

    const systemPrompt = `You are an expert curriculum planner and knowledge architect. Analyze the provided study material and generate a hierarchical topic tree showing main topics and subtopics in recommended learning order.
You MUST respond ONLY with a single valid JSON object. Do not include any explanations, introduction, or text outside of the raw JSON object.

JSON structure required:
{
  "topics": [
    {
      "name": "Main Topic Name",
      "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
      "order": 1
    }
  ]
}`;

    const userPrompt = `Study Material for ${subject.name}:\n${combinedText}\n\nGenerate the hierarchical topic tree in JSON format now.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
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

    let parsedTopics;
    try {
      parsedTopics = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Groq knowledge map JSON output:', rawContent);
      return res.status(500).json({
        message: 'Failed to parse generated knowledge map data. Please try again.',
        error: parseErr.message,
      });
    }

    await Subject.findByIdAndUpdate(
      req.params.id,
      { knowledgeMap: parsedTopics },
      { new: true }
    );

    return res.json({ knowledgeMap: parsedTopics });
  } catch (error) {
    console.error('Error in generateKnowledgeMap:', error.response?.data || error.message);
    return res.status(500).json({ message: `Error generating knowledge map: ${error.message}` });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
  getDashboardStats,
  logStudyTime,
  generateKnowledgeMap,
};
