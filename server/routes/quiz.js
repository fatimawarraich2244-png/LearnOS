const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const {
  generateQuiz,
  generateExam,
  submitQuiz,
  getQuizHistory,
  getAllQuizHistory,
} = require('../controllers/quizController');

router.get('/history-all', protect, getAllQuizHistory);
router.post('/generate', protect, aiRateLimiter, generateQuiz);
router.post('/generate-exam', protect, aiRateLimiter, generateExam);
router.post('/submit', protect, submitQuiz);
router.get('/history/:subjectId', protect, getQuizHistory);

module.exports = router;
