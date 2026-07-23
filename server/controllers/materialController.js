const fs = require('fs');
const path = require('path');
const Material = require('../models/Material');
const { parsePDF, parseDOCX } = require('../services/parser');
const { chunkText } = require('../utils/chunkText');
const { getEmbeddings } = require('../services/embeddings');

const uploadMaterial = async (req, res) => {
  try {
    const { subjectId } = req.body;
    
    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { mimetype, originalname, path: filePath } = req.file;
    const fileExtension = path.extname(originalname).toLowerCase().replace('.', '');

    let extractedText = '';

    if (mimetype === 'application/pdf') {
      extractedText = await parsePDF(filePath);
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await parseDOCX(filePath);
    } else if (mimetype === 'text/plain') {
      extractedText = fs.readFileSync(filePath, 'utf8');
    } else {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    console.log(`Extracted text length: ${extractedText.length}`);

    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from the material.`);

    const embeddings = await getEmbeddings(chunks);
    console.log(`Created ${embeddings.length} embeddings. First vector length: ${embeddings[0]?.length || 0}`);

    const material = await Material.create({
      subjectId,
      userId: req.userId,
      fileName: originalname,
      fileType: fileExtension || 'unknown',
      filePath,
      chunks,
      embeddings,
      embedded: true,
    });

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

module.exports = {
  uploadMaterial,
  getMaterialsBySubject,
};
