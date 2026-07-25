const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { generatePlan, getPlan } = require('../controllers/plannerController');

router.post('/generate', protect, aiRateLimiter, generatePlan);
router.get('/:subjectId', protect, getPlan);

module.exports = router;
