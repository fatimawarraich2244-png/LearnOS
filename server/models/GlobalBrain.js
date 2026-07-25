const mongoose = require('mongoose');

const globalBrainSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  weakConcepts: [
    {
      concept: { type: String, required: true },
      subjects: [{ type: String }],
      severity: { type: Number, min: 1, max: 10, default: 5 },
    },
  ],
  strongConcepts: [
    {
      concept: { type: String, required: true },
      subjects: [{ type: String }],
    },
  ],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('GlobalBrain', globalBrainSchema);
