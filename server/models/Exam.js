const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Index to speed up the duplicate day-window findOne lookup in createExam.
// Not unique: true because the same exam name is valid on different dates.
examSchema.index({ subjectId: 1, examDate: 1 });

module.exports = mongoose.model('Exam', examSchema);
