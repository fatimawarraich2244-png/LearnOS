const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');

// ── Fix 1 (XSS): Strip HTML tags before saving name — mirrors semesterController & subjectController.
const sanitizeName = (str) => str.replace(/<[^>]*>/g, '').trim();

// ── @desc   Get all exams for logged in user (optional upcomingOnly filter)
// ── @route  GET /api/exams
// ── @access Private
const getExams = async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.upcomingOnly === 'true') {
      filter.examDate = { $gte: new Date() };
    }

    const exams = await Exam.find(filter)
      .sort({ examDate: 1 })
      .populate('subjectId', 'name');

    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Create a new exam entry
// ── @route  POST /api/exams
// ── @access Private
const createExam = async (req, res) => {
  try {
    const { subjectId, name, examDate } = req.body;

    if (!subjectId || !name || !examDate) {
      return res.status(400).json({ message: 'subjectId, name, and examDate are required' });
    }

    // Fix 1 (XSS): sanitize before any further processing
    const cleanName = sanitizeName(name);
    if (!cleanName) {
      return res.status(400).json({ message: 'Exam name is required' });
    }

    // Fix 2 (validation): reject non-ObjectId subjectId with a clean 400
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subjectId format' });
    }

    // Fix 2 (validation): confirm the subject exists and belongs to this user
    const subject = await Subject.findOne({ _id: subjectId, userId: req.userId });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found or does not belong to you' });
    }

    // Fix 2 (validation): parse examDate explicitly so an invalid string returns a
    // clean 400 instead of a raw Mongoose ValidationError/500.
    const parsedDate = new Date(examDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid examDate — must be a valid date string (e.g. 2026-12-01)' });
    }

    // Fix 3 (past-date guard): reject dates earlier than now
    if (parsedDate < new Date()) {
      return res.status(400).json({ message: 'Exam date cannot be in the past' });
    }

    // Fix 4 (duplicate check): reject same name+subject+same-calendar-day.
    // A different subject OR a different date is still allowed.
    const dayStart = new Date(parsedDate); dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd   = new Date(parsedDate); dayEnd.setUTCHours(23, 59, 59, 999);
    const existing = await Exam.findOne({
      subjectId,
      userId: req.userId,
      name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      examDate: { $gte: dayStart, $lte: dayEnd },
    });
    if (existing) {
      return res.status(409).json({
        message: `An exam named "${cleanName}" already exists for this subject on that date.`,
      });
    }

    const exam = await Exam.create({
      userId: req.userId,
      subjectId,
      name: cleanName,
      examDate: parsedDate,
    });

    await exam.populate('subjectId', 'name');
    return res.status(201).json(exam);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Update an exam entry
// ── @route  PUT /api/exams/:id
// ── @access Private
const updateExam = async (req, res) => {
  try {
    const { subjectId, name, examDate } = req.body;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (subjectId) exam.subjectId = subjectId;

    if (name !== undefined) {
      // Fix 1 (XSS): sanitize name on update too
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({ message: 'Exam name is required' });
      }
      exam.name = cleanName;
    }

    if (examDate !== undefined) {
      // Fix 2 (validation): parse explicitly for a clean error on bad strings
      const parsedDate = new Date(examDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid examDate — must be a valid date string (e.g. 2026-12-01)' });
      }
      // Fix 3 (past-date guard): also enforced on updates
      if (parsedDate < new Date()) {
        return res.status(400).json({ message: 'Exam date cannot be in the past' });
      }
      exam.examDate = parsedDate;
    }

    await exam.save();
    await exam.populate('subjectId', 'name');

    return res.json(exam);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message });
  }
};

// ── @desc   Delete an exam entry
// ── @route  DELETE /api/exams/:id
// ── @access Private
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await exam.deleteOne();
    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getExams, createExam, updateExam, deleteExam };
