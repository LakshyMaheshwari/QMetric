const mongoose = require('mongoose');

const learnedVerbSchema = new mongoose.Schema(
  {
    verb: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      enum: ['cognitive', 'affective', 'psychomotor'],
      required: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    levelName: {
      type: String,
    },
    context: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
      default: 0.95,
      min: 0,
      max: 1,
    },
    taughtBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    taughtAt: {
      type: Date,
      default: Date.now,
    },
    usageCount: {
      type: Number,
      default: 1,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
    },
  },
  { timestamps: true }
);

// Compound index — unique verb per college (or globally if no college)
learnedVerbSchema.index(
  { verb: 1, collegeId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('LearnedVerb', learnedVerbSchema);