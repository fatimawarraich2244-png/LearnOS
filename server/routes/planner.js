const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generatePlan, getPlan } = require('../controllers/plannerController');

router.post('/generate', protect, generatePlan);
router.get('/:subjectId', protect, getPlan);

module.exports = router;
