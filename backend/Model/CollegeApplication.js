const mongoose = require('mongoose');

const collegeApplicationSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
  },
  collegeCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 20,
  },
  address: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  state: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  contactPhone: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Phone must be exactly 10 digits'],
  },
  adminPasswordHash: {
    type: String,
    required: true,
    select: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  createdCollegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
  },
  createdAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

collegeApplicationSchema.index({ status: 1, createdAt: -1 });
collegeApplicationSchema.index({ collegeCode: 1, status: 1 });
collegeApplicationSchema.index({ contactEmail: 1, status: 1 });
collegeApplicationSchema.index({ collegeName: 1, status: 1 });

module.exports = mongoose.model('CollegeApplication', collegeApplicationSchema);
