const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
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
    examDate: {
      type: Date,
      required: true,
    },
    hoursPerDay: {
      type: Number,
      required: true,
    },
    schedule: [
      {
        date: { type: String, required: true },
        topics: [{ type: String }],
        durationMinutes: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
