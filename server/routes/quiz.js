const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateQuiz, submitQuiz } = require('../controllers/quizController');

router.post('/generate', protect, generateQuiz);
router.post('/submit', protect, submitQuiz);

module.exports = router;
