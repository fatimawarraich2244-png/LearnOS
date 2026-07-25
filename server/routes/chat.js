const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { askQuestion, detectConfusion, explainAtLevel, feynmanFeedback, getChatHistory } = require('../controllers/chatController');

router.post('/ask', protect, askQuestion);
router.post('/confusion', protect, detectConfusion);
router.post('/explain-level', protect, explainAtLevel);
router.post('/feynman', protect, feynmanFeedback);
router.get('/:subjectId', protect, getChatHistory);

module.exports = router;
