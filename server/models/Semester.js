const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,      // strip leading/trailing whitespace before save
      maxlength: [100, 'Semester name cannot exceed 100 characters'],
    },
  },
  { timestamps: true }
);

// Compound index: one user cannot have two semesters with the same name.
// This is a DB-layer safety net that complements the controller-level duplicate check.
semesterSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Semester', semesterSchema);
