const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSemesters,
  createSemester,
  deleteSemester,
} = require('../controllers/semesterController');

router.get('/', protect, getSemesters);
router.post('/', protect, createSemester);
router.delete('/:id', protect, deleteSemester);

module.exports = router;
