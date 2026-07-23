const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    chunks: {
      type: [String],
      default: [],
    },
    embeddings: {
      type: [[Number]],
      default: [],
    },
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
