const mongoose = require('mongoose');

const verifiedQuestionSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaperInfo',
      required: true,
      index: true,
    },
    questionIndex: {
      type: Number,
      required: true,
    },
    originalDomain: {
      type: String,
      enum: ['cognitive', 'affective', 'psychomotor'],
    },
    originalLevel: {
      type: Number,
      min: 1,
      max: 7,
    },
    originalScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    correctedDomain: {
      type: String,
      enum: ['cognitive', 'affective', 'psychomotor'],
      required: true,
    },
    correctedLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    correctedLevelName: {
      type: String,
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    correctedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// One correction per question per paper
verifiedQuestionSchema.index(
  { paperId: 1, questionIndex: 1 },
  { unique: true }
);

module.exports = mongoose.model('VerifiedQuestion', verifiedQuestionSchema);