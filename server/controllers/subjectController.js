const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');

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

module.exports = {
  getSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
  getDashboardStats,
  logStudyTime,
};
