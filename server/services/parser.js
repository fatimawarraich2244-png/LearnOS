const pdfModule = require('pdf-parse');
const mammoth = require('mammoth');

// Both functions now accept a Buffer directly — no disk I/O needed
const parsePDF = async (buffer) => {
  try {
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return data.text || '';
    }
    if (pdfModule && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      return data.text || '';
    }
    if (pdfModule && typeof pdfModule.PDFParse === 'function') {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const data = await parser.getText();
      return data.text || '';
    }
    throw new Error('pdf-parse module format is unrecognized');
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

const parseDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
};

module.exports = {
  parsePDF,
  parseDOCX
};
