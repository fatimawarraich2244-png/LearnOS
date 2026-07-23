const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { uploadMaterial, getMaterialsBySubject } = require('../controllers/materialController');

router.post('/upload', protect, upload.single('file'), uploadMaterial);
router.get('/:subjectId', protect, getMaterialsBySubject);

module.exports = router;
