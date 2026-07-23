const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
  getDashboardStats,
  logStudyTime,
} = require('../controllers/subjectController');

// ── Fixed / specific routes MUST come before parameterized routes (e.g. /:semesterId)
router.get('/stats/overview', protect, getDashboardStats);
router.get('/single/:id', protect, getSubjectById);
router.get('/:semesterId', protect, getSubjects);
router.post('/', protect, createSubject);
router.post('/:id/log-time', protect, logStudyTime);
router.put('/:id', protect, updateSubject);
router.delete('/:id', protect, deleteSubject);

module.exports = router;
