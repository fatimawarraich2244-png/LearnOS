const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { askQuestion, detectConfusion, getChatHistory } = require('../controllers/chatController');

router.post('/ask', protect, askQuestion);
router.post('/confusion', protect, detectConfusion);
router.get('/:subjectId', protect, getChatHistory);

module.exports = router;
