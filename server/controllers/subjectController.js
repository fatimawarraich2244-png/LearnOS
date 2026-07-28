const axios = require('axios');
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const Material = require('../models/Material');
const ChatMessage = require('../models/ChatMessage');
const StudyPlan = require('../models/StudyPlan');
const { sanitizeName, sanitizeObjectStrings } = require('../utils/sanitize');

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

    // Fix 2 (XSS): sanitize before any further processing
    const cleanName = sanitizeName(name);
    if (!cleanName) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    // Fix 4 (semesterId validation): reject non-ObjectId values with a clean 400
    // instead of letting Mongoose throw a raw 500 cast error.
    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ message: 'Invalid semesterId format' });
    }

    // Fix 4 (semesterId validation): confirm the semester exists and belongs to this user.
    const semester = await Semester.findOne({ _id: semesterId, userId: req.userId });
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found or does not belong to you' });
    }

    // Fix 3 (duplicate check): reject same name within the same semester (case-insensitive).
    // Same name in a DIFFERENT semester is intentionally allowed (T7 behaviour).
    const existing = await Subject.findOne({
      semesterId,
      userId: req.userId,
      name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(409).json({ message: `A subject named "${cleanName}" already exists in this semester.` });
    }

    const subject = await Subject.create({ name: cleanName, semesterId, userId: req.userId });
    return res.status(201).json(subject);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
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

    // Fix 1 (cascade delete): remove all documents that reference this subject
    // before deleting the subject itself, so nothing is left orphaned.
    //
    // Dependency tree rooted at Subject:
    //   Subject
    //   ├── Exam         (subjectId)
    //   ├── Quiz         (subjectId)
    //   ├── Material     (subjectId)
    //   ├── ChatMessage  (subjectId)
    //   └── StudyPlan    (subjectId)
    await Promise.all([
      Exam.deleteMany({ subjectId: req.params.id }),
      Quiz.deleteMany({ subjectId: req.params.id }),
      Material.deleteMany({ subjectId: req.params.id }),
      ChatMessage.deleteMany({ subjectId: req.params.id }),
      StudyPlan.deleteMany({ subjectId: req.params.id }),
    ]);

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

    const { name, weakTopics, strongTopics, studyTimeMinutes } = req.body;
    if (name !== undefined) {
      // Fix 2 (XSS): sanitize on update too, matching createSubject behaviour.
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({ message: 'Subject name is required' });
      }
      subject.name = cleanName;
    }
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
    const { period = 'all' } = req.query;

    let cutoffDate = null;
    const now = new Date();
    if (period === 'week') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const quizQuery = { userId: req.userId };
    if (cutoffDate) {
      quizQuery.$or = [
        { takenAt: { $gte: cutoffDate } },
        { takenAt: { $exists: false }, createdAt: { $gte: cutoffDate } },
      ];
    }

    const subjects = await Subject.find({ userId: req.userId });
    const quizzes = await Quiz.find(quizQuery).sort({ takenAt: -1, createdAt: -1 });

    console.log('[DEBUG getDashboardStats] req.userId:', req.userId);
    console.log('[DEBUG getDashboardStats] subjects count:', subjects.length, 'subjects:', subjects.map(s => ({ id: s._id, name: s.name, weakTopics: s.weakTopics })));
    console.log('[DEBUG getDashboardStats] quizzes count:', quizzes.length, 'quizzes:', quizzes.map(q => ({ id: q._id, subjectId: q.subjectId, score: q.score })));

    let overallProgress = 0;
    if (quizzes.length > 0) {
      const totalScore = quizzes.reduce((sum, q) => sum + (q.score || 0), 0);
      overallProgress = Math.round(totalScore / quizzes.length);
    }

    // Note: totalStudyTimeMinutes is stored as a running total on Subject documents, so it remains an all-time value regardless of period filter.
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

    const { updateWeeklyProgress } = require('../services/gamification');
    await updateWeeklyProgress(req.userId);

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
    // ── Fix (A3): Add isValid check for subjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid subjectId format' });
    }

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
        // Filter out any null/empty/whitespace-only chunk strings before joining
        const validChunks = mat.chunks.filter((c) => typeof c === 'string' && c.trim().length > 0);
        allChunks = allChunks.concat(validChunks);
      }
    });

    if (allChunks.length === 0) {
      return res.status(400).json({ message: 'Study materials contain no text content to generate a knowledge map.' });
    }

    const combinedText = allChunks.join('\n\n').slice(0, 6000);

    // ── DEBUG: verify we're sending the actual uploaded material content ──────
    console.log('[generateKnowledgeMap] subjectId:', req.params.id);
    console.log('[generateKnowledgeMap] materials found:', materials.length, '| total chunks:', allChunks.length);
    console.log('[generateKnowledgeMap] combinedText preview (first 500 chars):\n', combinedText.slice(0, 500));
    // ─────────────────────────────────────────────────────────────────────────

    const systemPrompt = `You are an expert curriculum planner and knowledge architect.
Analyze ONLY the following text content provided by the user. DO NOT make any assumptions based on subject names, course titles, or labels — base your entire analysis strictly on the concepts and ideas present in the text itself.
Generate a hierarchical topic tree showing the main topics and subtopics found in the text, ordered by recommended learning sequence (foundational concepts first).

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

    // NOTE: subject.name intentionally omitted — Groq must derive topics purely from the text content
    const userPrompt = `Analyze ONLY the following study material text content. Ignore any subject name labels or course titles — extract the actual concepts and topics contained within this text:\n\n${combinedText}\n\nGenerate the hierarchical topic tree in JSON format now.`;

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
      // ── Fix (A4): Sanitize parsed JSON before saving to DB
      parsedTopics = sanitizeObjectStrings(parsedTopics);
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

// ── @desc   Get combined recent activity (chats and quizzes) for user
// ── @route  GET /api/subjects/activity/recent
// ── @access Private
const getRecentActivity = async (req, res) => {
  try {
    const ChatMessage = require('../models/ChatMessage');

    const recentChats = await ChatMessage.find({
      userId: req.userId,
      role: 'user',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('subjectId', 'name');

    const recentQuizzes = await Quiz.find({
      userId: req.userId,
    })
      .sort({ takenAt: -1, createdAt: -1 })
      .limit(3)
      .populate('subjectId', 'name');

    const chatItems = recentChats.map((c) => ({
      id: c._id,
      type: 'chat',
      subjectName: c.subjectId?.name || 'Subject',
      subjectId: c.subjectId?._id || c.subjectId,
      text: c.content,
      date: c.createdAt,
    }));

    const quizItems = recentQuizzes.map((q) => ({
      id: q._id,
      type: 'quiz',
      subjectName: q.subjectId?.name || 'Subject',
      subjectId: q.subjectId?._id || q.subjectId,
      score: q.score,
      date: q.takenAt || q.createdAt,
    }));

    const combined = [...chatItems, ...quizItems];
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const limited = combined.slice(0, 5);

    return res.json(limited);
  } catch (error) {
    console.error('Error in getRecentActivity:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get all user subjects across all semesters
// ── @route  GET /api/subjects/user/all
// ── @access Private
const getAllUserSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.userId }).sort({ name: 1 });
    return res.json(subjects);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get comprehensive full progress report data for user
// ── @route  GET /api/subjects/report/full
// ── @access Private
const getFullReport = async (req, res) => {
  try {
    const ChatMessage = require('../models/ChatMessage');

    const subjects = await Subject.find({ userId: req.userId });
    const quizzes = await Quiz.find({ userId: req.userId }).sort({ takenAt: 1, createdAt: 1 });
    const materialsCount = await Material.countDocuments({ userId: req.userId });
    const chatCount = await ChatMessage.countDocuments({ userId: req.userId, role: 'user' });

    let totalStudyTimeMinutes = 0;
    subjects.forEach((s) => {
      totalStudyTimeMinutes += s.studyTimeMinutes || 0;
    });

    const chatCountsBySubject = {};
    const chats = await ChatMessage.find({ userId: req.userId, role: 'user' });
    chats.forEach((c) => {
      const sid = c.subjectId ? c.subjectId.toString() : 'unknown';
      chatCountsBySubject[sid] = (chatCountsBySubject[sid] || 0) + 1;
    });

    const quizCountsBySubject = {};
    const quizScoresBySubject = {};
    quizzes.forEach((q) => {
      const sid = q.subjectId ? q.subjectId.toString() : 'unknown';
      quizCountsBySubject[sid] = (quizCountsBySubject[sid] || 0) + 1;
      if (!quizScoresBySubject[sid]) quizScoresBySubject[sid] = [];
      quizScoresBySubject[sid].push({
        date: q.takenAt || q.createdAt,
        score: q.score || 0,
      });
    });

    const subjectReports = subjects.map((s) => {
      const sid = s._id.toString();
      const scoresTrend = quizScoresBySubject[sid] || [];
      const quizCount = scoresTrend.length;
      let avgScore = 0;
      if (quizCount > 0) {
        const sum = scoresTrend.reduce((acc, curr) => acc + curr.score, 0);
        avgScore = Math.round(sum / quizCount);
      }

      return {
        subjectId: s._id,
        name: s.name,
        studyTimeMinutes: s.studyTimeMinutes || 0,
        weakTopics: s.weakTopics || [],
        strongTopics: s.strongTopics || [],
        quizCount,
        averageScore: avgScore,
        scoresTrend,
      };
    });

    let mostActiveSubject = null;
    let maxActivityScore = -1;

    subjects.forEach((s) => {
      const sid = s._id.toString();
      const studyMins = s.studyTimeMinutes || 0;
      const cCount = chatCountsBySubject[sid] || 0;
      const qCount = quizCountsBySubject[sid] || 0;
      const activityScore = studyMins + cCount * 5 + qCount * 10;

      if (activityScore > maxActivityScore) {
        maxActivityScore = activityScore;
        mostActiveSubject = {
          subjectId: s._id,
          name: s.name,
          studyTimeMinutes: studyMins,
          chatCount: cCount,
          quizCount: qCount,
          activityScore,
        };
      }
    });

    return res.json({
      summary: {
        totalStudyTimeMinutes,
        totalQuizzesTaken: quizzes.length,
        totalMaterialsUploaded: materialsCount,
        totalQuestionsAsked: chatCount,
        totalSubjects: subjects.length,
      },
      mostActiveSubject,
      subjects: subjectReports,
    });
  } catch (error) {
    console.error('Error in getFullReport:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get combined calendar events (Exams & Study Plans) for user
// ── @route  GET /api/subjects/calendar-events
// ── @access Private
const getCalendarEvents = async (req, res) => {
  try {
    const Exam = require('../models/Exam');
    const StudyPlan = require('../models/StudyPlan');

    const exams = await Exam.find({ userId: req.userId }).populate('subjectId', 'name');
    const studyPlans = await StudyPlan.find({ userId: req.userId }).populate('subjectId', 'name');

    const events = [];

    exams.forEach((exam) => {
      if (exam.examDate) {
        const d = new Date(exam.examDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        events.push({
          id: exam._id.toString(),
          date: dateStr,
          title: exam.name,
          subtitle: exam.subjectId ? exam.subjectId.name : 'Subject',
          type: 'exam',
        });
      }
    });

    studyPlans.forEach((plan) => {
      const subjectName = plan.subjectId ? plan.subjectId.name : 'Study Session';
      if (Array.isArray(plan.schedule)) {
        plan.schedule.forEach((entry) => {
          if (entry.date) {
            let dateStr = entry.date;
            if (entry.date.includes('T')) {
              const d = new Date(entry.date);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              dateStr = `${year}-${month}-${day}`;
            }
            const topicsText = Array.isArray(entry.topics) ? entry.topics.join(', ') : (entry.topics || 'Study Session');
            events.push({
              id: `${plan._id}-${entry.date}`,
              date: dateStr,
              title: topicsText,
              subtitle: `${subjectName} (${entry.durationMinutes || 30} mins)`,
              type: 'study-plan',
            });
          }
        });
      }
    });

    return res.json(events);
  } catch (error) {
    console.error('Error in getCalendarEvents:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Global search across Subjects, Materials, and ChatMessages
// ── @route  GET /api/subjects/search?q=searchterm
// ── @access Private
const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }

    const queryStr = q.trim();
    const regex = new RegExp(queryStr.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');

    const Material = require('../models/Material');
    const ChatMessage = require('../models/ChatMessage');

    const [matchedSubjects, matchedMaterials, matchedChats] = await Promise.all([
      Subject.find({ userId: req.userId, name: regex }).limit(10),
      Material.find({ userId: req.userId, fileName: regex }).populate('subjectId', 'name').limit(10),
      ChatMessage.find({ userId: req.userId, role: 'user', content: regex })
        .populate('subjectId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const results = [];

    matchedSubjects.forEach((s) => {
      results.push({
        type: 'subject',
        title: s.name,
        subtitle: 'Subject Course',
        subjectId: s._id.toString(),
        link: `/subjects/${s._id}`,
      });
    });

    matchedMaterials.forEach((m) => {
      const subjName = m.subjectId ? m.subjectId.name : 'Subject';
      const subjId = m.subjectId ? (m.subjectId._id ? m.subjectId._id.toString() : m.subjectId.toString()) : '';
      results.push({
        type: 'material',
        title: m.fileName,
        subtitle: `Material in ${subjName}`,
        subjectId: subjId,
        link: subjId ? `/subjects/${subjId}` : '/dashboard',
      });
    });

    matchedChats.forEach((c) => {
      const subjName = c.subjectId ? c.subjectId.name : 'Subject';
      const subjId = c.subjectId ? (c.subjectId._id ? c.subjectId._id.toString() : c.subjectId.toString()) : '';
      const snippet = c.content.length > 60 ? c.content.slice(0, 60) + '...' : c.content;
      results.push({
        type: 'chat',
        title: snippet,
        subtitle: `Chat in ${subjName}`,
        subjectId: subjId,
        link: subjId ? `/subjects/${subjId}` : '/dashboard',
      });
    });

    return res.json(results.slice(0, 20));
  } catch (error) {
    console.error('Error in globalSearch:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Get all subjects for user populated with semester name
// ── @route  GET /api/subjects/all
// ── @access Private
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.userId })
      .populate('semesterId', 'name')
      .sort({ createdAt: -1 });

    return res.json(subjects);
  } catch (error) {
    console.error('Error in getAllSubjects:', error.message);
    return res.status(500).json({ message: error.message });
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
  getRecentActivity,
  getAllUserSubjects,
  getFullReport,
  getCalendarEvents,
  globalSearch,
  getAllSubjects,
};
