const mongoose = require('mongoose');

const reviewHistorySchema = new mongoose.Schema({
  reviewerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:      { type: String, enum: ['approved', 'rejected', 'needs_revision', 'comment'] },
  comments:    { type: String, default: '', maxlength: 2000 },
  timestamp:   { type: Date, default: Date.now },
}, { _id: false });

const PaperSchema = new mongoose.Schema({
  // ── Existing core fields ─────────────────────────────────────────────────
  "College Name":   { type: String, required: true },
  "Branch":         { type: String, required: true },
  "Year Of Study":  { type: String, required: true },
  "Semester":       { type: String, required: true },
  "Course Name":    { type: String, required: true },
  "Course Code":    { type: String, required: true },
  "Course Teacher": { type: String, required: true },
  "Sequence":       [],
  "Collected Data": [],
  "bloomLevelMap":  { type: Object },
  BloomRecommendations: { type: Array, default: null },
  appliedCorrections: { type: Array, default: [] },
  correctionsSummary: { type: Object, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Multi-tenant college reference (optional for backward-compat) ─────────
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
    index: true,
  },

  // ── Cloudinary storage reference ──────────────────────────────────────────
  cloudinaryPublicId: { type: String, default: null },
  fileUrl:            { type: String, default: '' },

  // ── Review workflow ───────────────────────────────────────────────────────
  submittedAt: { type: Date, default: null },
  qualityScore: { type: Number, min: 0, max: 100, default: null },

  reviewStatus: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'needs_revision'],
    default: 'draft',
    index: true,
  },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewComments:  { type: String, default: '', maxlength: 2000 },
  reviewHistory:   { type: [reviewHistorySchema], default: [] },
  reviewedAt:      { type: Date, default: null },

}, { timestamps: true });

PaperSchema.index({ userId: 1 });
PaperSchema.index({ createdAt: -1 });
// Compound for the teacher list query: filter by userId + sort by createdAt
PaperSchema.index({ userId: 1, createdAt: -1 });
// Compound for the reviewer/admin list query: collegeId + status + sort
PaperSchema.index({ collegeId: 1, reviewStatus: 1, createdAt: -1 });


const PaperInfo = mongoose.model('PaperInfo', PaperSchema);

module.exports = PaperInfo;
