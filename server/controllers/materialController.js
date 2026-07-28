const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Material = require('../models/Material');
const Subject = require('../models/Subject');
const { parsePDF, parseDOCX } = require('../services/parser');
const { chunkText } = require('../utils/chunkText');
const { getEmbeddings } = require('../services/embeddings');

// ── Fix 4 (M10): XSS sanitization
const sanitizeName = (str) => (str ? str.replace(/<[^>]*>/g, '').trim() : '');

// Safe file cleanup helper
const safeDeleteFile = (p) => {
  if (p && fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (e) { console.error('Failed to clean up temp file', e); }
  }
};

const uploadMaterial = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    if (!subjectId) {
      if (req.file) safeDeleteFile(req.file.path);
      return res.status(400).json({ message: 'subjectId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { mimetype, originalname, path: filePath } = req.file;

    // ── Fix 1 (M2b/M2c): subjectId validation + cleanup
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      safeDeleteFile(filePath);
      return res.status(400).json({ message: 'Invalid subjectId format' });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId: req.userId });
    if (!subject) {
      safeDeleteFile(filePath);
      return res.status(404).json({ message: 'Subject not found or does not belong to you' });
    }

    // ── Fix 4 (M10): XSS sanitization on originalname
    const safeFileName = sanitizeName(originalname) || 'unnamed_file';
    const fileExtension = path.extname(originalname).toLowerCase().replace('.', '');

    // ── Fix 2 (M8/M11): Duplicate check (must happen before API calls)
    const existing = await Material.findOne({ subjectId, fileName: safeFileName });
    if (existing) {
      safeDeleteFile(filePath);
      return res.status(409).json({ message: 'This file has already been uploaded to this subject' });
    }

    let extractedText = '';

    // ── Fix 5 (M5): Catch pdf-parse errors and convert to clean 400
    try {
      if (mimetype === 'application/pdf') {
        extractedText = await parsePDF(filePath);
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        extractedText = await parseDOCX(filePath);
      } else if (mimetype === 'text/plain') {
        extractedText = fs.readFileSync(filePath, 'utf8');
      } else {
        safeDeleteFile(filePath);
        return res.status(400).json({ message: 'Unsupported file type' });
      }
    } catch (parseErr) {
      console.error('File parsing error:', parseErr);
      safeDeleteFile(filePath);
      return res.status(400).json({ message: 'Invalid or corrupted file content' });
    }

    // ── Fix 3 (M4/M7): Guard against empty files / scanned images
    if (extractedText.trim().length === 0) {
      safeDeleteFile(filePath);
      return res.status(400).json({ message: 'No extractable text found in this file' });
    }

    console.log(`Extracted text length: ${extractedText.length}`);

    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from the material.`);

    const embeddings = await getEmbeddings(chunks);
    console.log(`Created ${embeddings.length} embeddings. First vector length: ${embeddings[0]?.length || 0}`);

    const material = await Material.create({
      subjectId,
      userId: req.userId,
      fileName: safeFileName,
      fileType: fileExtension || 'unknown',
      filePath,
      chunks,
      embeddings,
      embedded: true,
    });

    // Gamification Integration
    const { addXP, updateStreak, updateWeeklyProgress } = require('../services/gamification');
    await addXP(req.userId, 10);
    await updateStreak(req.userId);
    await updateWeeklyProgress(req.userId);

    return res.status(201).json(material);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

const getMaterialsBySubject = async (req, res) => {
  try {
    const materials = await Material.find({
      subjectId: req.params.subjectId,
      userId: req.userId,
    }).sort({ createdAt: -1 });
    return res.json(materials);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findById(id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (material.filePath) {
      try {
        if (fs.existsSync(material.filePath)) {
          fs.unlinkSync(material.filePath);
        }
      } catch (err) {
        console.error('Error unlinking file:', err);
      }
    }

    await material.deleteOne();

    return res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadMaterial,
  getMaterialsBySubject,
  deleteMaterial,
};
