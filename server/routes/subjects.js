const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSubjects,
  createSubject,
  deleteSubject,
} = require('../controllers/subjectController');

router.get('/:semesterId', protect, getSubjects);
router.post('/', protect, createSubject);
router.delete('/:id', protect, deleteSubject);

module.exports = router;
