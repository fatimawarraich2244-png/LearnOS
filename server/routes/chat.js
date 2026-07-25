const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { askQuestion, detectConfusion, explainAtLevel, feynmanFeedback, getChatHistory } = require('../controllers/chatController');

router.post('/ask', protect, aiRateLimiter, askQuestion);
router.post('/confusion', protect, aiRateLimiter, detectConfusion);
router.post('/explain-level', protect, aiRateLimiter, explainAtLevel);
router.post('/feynman', protect, aiRateLimiter, feynmanFeedback);
router.get('/:subjectId', protect, aiRateLimiter, getChatHistory);

module.exports = router;
