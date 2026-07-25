const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateGlobalBrain } = require('../controllers/brainController');
const GlobalBrain = require('../models/GlobalBrain');

// POST /api/brain/update — Run AI analysis and update GlobalBrain
router.post('/update', protect, updateGlobalBrain);

// GET /api/brain/ — Return the current GlobalBrain for this user (or null)
router.get('/', protect, async (req, res) => {
  try {
    const brain = await GlobalBrain.findOne({ userId: req.userId });
    return res.json(brain);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
