const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  updateSubject,
} = require('../controllers/subjectController');

router.get('/single/:id', protect, getSubjectById);
router.get('/:semesterId', protect, getSubjects);
router.post('/', protect, createSubject);
router.put('/:id', protect, updateSubject);
router.delete('/:id', protect, deleteSubject);

module.exports = router;
