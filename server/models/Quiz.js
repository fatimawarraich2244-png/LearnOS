const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
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
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: String, required: true },
        explanation: { type: String, required: true },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      default: 'medium',
    },
    examMode: {
      type: Boolean,
      default: false,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    topic: {
      type: String,
      default: '',
    },
    takenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
