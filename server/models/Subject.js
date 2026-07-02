const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    strongTopics: {
      type: [String],
      default: [],
    },
    studyTimeMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
