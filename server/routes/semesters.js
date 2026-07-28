const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSemesters,
  createSemester,
  deleteSemester,
  updateSemester,
} = require('../controllers/semesterController');

router.get('/', protect, getSemesters);
router.post('/', protect, createSemester);
router.put('/:id', protect, updateSemester);
router.delete('/:id', protect, deleteSemester);

module.exports = router;
