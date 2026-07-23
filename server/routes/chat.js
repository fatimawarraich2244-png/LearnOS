const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { askQuestion } = require('../controllers/chatController');

router.post('/ask', protect, askQuestion);

module.exports = router;
