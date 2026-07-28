const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const Material = require('../models/Material');
const ChatMessage = require('../models/ChatMessage');
const StudyPlan = require('../models/StudyPlan');

// ── Fix 3: Strip HTML tags to prevent XSS payloads from being stored in the DB.
// React auto-escapes JSX text so the current list view is safe, but other surfaces
// (PDF export, emails, future innerHTML use) would be at risk without this guard.
const sanitizeName = (str) =>
  str.replace(/<[^>]*>/g, '').trim();

// ── @desc   Get all semesters for logged-in user with subject count
// ── @route  GET /api/semesters
// ── @access Private
const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find({ userId: req.userId }).sort({ createdAt: 1 }).lean();

    const semestersWithCounts = await Promise.all(
      semesters.map(async (semester) => {
        const subjectCount = await Subject.countDocuments({ semesterId: semester._id });
        return {
          ...semester,
          subjectCount,
        };
      })
    );

    return res.json(semestersWithCounts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Create a new semester
// ── @route  POST /api/semesters
// ── @access Private
const createSemester = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Semester name is required' });
    }

    // Fix 3: sanitize before any further processing
    const cleanName = sanitizeName(name);

    if (!cleanName) {
      return res.status(400).json({ message: 'Semester name is required' });
    }

    // Fix 2: reject duplicate names per user (case-insensitive match)
    const existing = await Semester.findOne({
      userId: req.userId,
      name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(409).json({ message: `A semester named "${cleanName}" already exists.` });
    }

    const semester = await Semester.create({ userId: req.userId, name: cleanName });
    return res.status(201).json({ ...semester.toObject(), subjectCount: 0 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Delete a semester by ID
// ── @route  DELETE /api/semesters/:id
// ── @access Private
const deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }

    if (semester.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Fix 1: cascade delete the full dependency chain before removing the semester.
    //
    // Dependency tree:
    //   Semester
    //   └── Subject          (semesterId)
    //       ├── Exam         (subjectId)
    //       ├── Quiz         (subjectId)
    //       ├── Material     (subjectId)
    //       ├── ChatMessage  (subjectId)
    //       └── StudyPlan    (subjectId)
    //
    // Collect all subject IDs first so we can delete their dependents in bulk.
    const subjects = await Subject.find(
      { semesterId: req.params.id },
      { _id: 1 }          // projection — only fetch _id, not the full document
    );
    const subjectIds = subjects.map((s) => s._id);

    if (subjectIds.length > 0) {
      // Delete all subject-level dependents in parallel for efficiency
      await Promise.all([
        Exam.deleteMany({ subjectId: { $in: subjectIds } }),
        Quiz.deleteMany({ subjectId: { $in: subjectIds } }),
        Material.deleteMany({ subjectId: { $in: subjectIds } }),
        ChatMessage.deleteMany({ subjectId: { $in: subjectIds } }),
        StudyPlan.deleteMany({ subjectId: { $in: subjectIds } }),
      ]);

      // Now delete the subjects themselves
      await Subject.deleteMany({ semesterId: req.params.id });
    }

    // Finally delete the semester
    await semester.deleteOne();
    return res.json({ message: 'Semester deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Update a semester by ID (rename)
// ── @route  PUT /api/semesters/:id
// ── @access Private
const updateSemester = async (req, res) => {
  try {
    const { name } = req.body;
    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }

    if (semester.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (name) {
      // Fix 3: sanitize on update too
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({ message: 'Semester name is required' });
      }
      semester.name = cleanName;
    }

    await semester.save();
    return res.json(semester);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getSemesters, createSemester, deleteSemester, updateSemester };
