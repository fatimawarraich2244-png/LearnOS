const Exam = require('../models/Exam');

// ── @desc   Get all upcoming exams for logged in user
// ── @route  GET /api/exams
// ── @access Private
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find({
      userId: req.userId,
      examDate: { $gte: new Date() },
    })
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

    const exam = await Exam.create({
      userId: req.userId,
      subjectId,
      name,
      examDate,
    });

    await exam.populate('subjectId', 'name');

    return res.status(201).json(exam);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getExams, createExam };
