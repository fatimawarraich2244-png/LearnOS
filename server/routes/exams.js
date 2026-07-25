const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getExams, createExam } = require('../controllers/examController');

router.get('/', protect, getExams);
router.post('/', protect, createExam);

module.exports = router;
