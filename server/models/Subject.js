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
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
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
    knowledgeMap: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: one semester cannot have two subjects with the same name.
// Scoped to semesterId (not userId) so the same name IS allowed in different semesters.
subjectSchema.index({ semesterId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
