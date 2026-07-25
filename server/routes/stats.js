const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { getUserStats, analyzeLearningDNA } = require('../controllers/statsController');
const UserStats = require('../models/UserStats');

router.get('/', protect, getUserStats);
router.post('/learning-dna', protect, aiRateLimiter, analyzeLearningDNA);
router.get('/learning-dna', protect, async (req, res) => {
  try {
    const stats = await UserStats.findOne({ userId: req.userId });
    return res.json({ learningDNA: stats?.learningDNA || null });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
