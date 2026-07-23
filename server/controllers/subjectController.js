const Subject = require('../models/Subject');

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

module.exports = { getSubjects, createSubject, deleteSubject, getSubjectById, updateSubject };
