const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateQuiz, generateExam, submitQuiz, getQuizHistory } = require('../controllers/quizController');

router.post('/generate', protect, generateQuiz);
router.post('/generate-exam', protect, generateExam);
router.post('/submit', protect, submitQuiz);
router.get('/history/:subjectId', protect, getQuizHistory);

module.exports = router;
