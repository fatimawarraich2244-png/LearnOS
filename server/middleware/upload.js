const multer = require('multer');

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(), // Files held in RAM buffer — never written to disk
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
