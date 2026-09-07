const mongoose = require('mongoose');

/**
 * Feedback Schema
 * Stores user feedback submissions with rating (0-100) and text.
 * resolved: admin can mark a feedback as resolved/actioned.
 */
const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model('Feedback', feedbackSchema);
