const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getExams,
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');

router.get('/', protect, getExams);
router.post('/', protect, createExam);
router.put('/:id', protect, updateExam);
router.delete('/:id', protect, deleteExam);

module.exports = router;
