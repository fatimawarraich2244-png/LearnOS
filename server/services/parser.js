const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const parsePDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

const parseDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
};

module.exports = {
  parsePDF,
  parseDOCX
};
