const mongoose = require('mongoose');

const DOMAIN_LEVEL_LIMITS = {
  cognitive: 6,
  affective: 5,
  psychomotor: 7,
};

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
      validate: {
        validator: function (value) {
          const maxLevel = DOMAIN_LEVEL_LIMITS[this.domain];

          return (
            Number.isInteger(value) &&
            Number.isInteger(maxLevel) &&
            value >= 1 &&
            value <= maxLevel
          );
        },
        message: function (props) {
          const domain = props.instance?.domain || 'selected domain';
          const maxLevel = DOMAIN_LEVEL_LIMITS[domain] || 7;

          return `level must be between 1 and ${maxLevel} for ${domain}`;
        },
      },
    },

    levelName: {
      type: String,
      trim: true,
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
      min: 0,
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