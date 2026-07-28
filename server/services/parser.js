const fs = require('fs');
const pdfModule = require('pdf-parse');
const mammoth = require('mammoth');

const parsePDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(dataBuffer);
      return data.text || '';
    }
    if (pdfModule && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(dataBuffer);
      return data.text || '';
    }
    if (pdfModule && typeof pdfModule.PDFParse === 'function') {
      const parser = new pdfModule.PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      return data.text || '';
    }
    throw new Error('pdf-parse module format is unrecognized');
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

const parseDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
};

module.exports = {
  parsePDF,
  parseDOCX
};
