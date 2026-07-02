const Semester = require('../models/Semester');

// ── @desc   Get all semesters for logged-in user
// ── @route  GET /api/semesters
// ── @access Private
const getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find({ userId: req.userId });
    return res.json(semesters);
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

    if (!name) {
      return res.status(400).json({ message: 'Semester name is required' });
    }

    const semester = await Semester.create({ userId: req.userId, name });
    return res.status(201).json(semester);
  } catch (error) {
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

    await semester.deleteOne();
    return res.json({ message: 'Semester deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getSemesters, createSemester, deleteSemester };
