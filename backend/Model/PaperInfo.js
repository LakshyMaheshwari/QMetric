const mongoose = require('mongoose');

const reviewHistorySchema = new mongoose.Schema({
  reviewerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:      { type: String, enum: ['approved', 'rejected', 'needs_revision', 'comment'] },
  comments:    { type: String, default: '' },
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
  "blommLevelMap":  { type: Object },
  "bloomLevelMap":  { type: Object },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Multi-tenant college reference (optional for backward-compat) ─────────
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
    index: true,
  },

  // ── Review workflow ───────────────────────────────────────────────────────
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_revision'],
    default: 'pending',
    index: true,
  },
  reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewComments:  { type: String, default: '', maxlength: 2000 },
  reviewHistory:   { type: [reviewHistorySchema], default: [] },
  reviewedAt:      { type: Date, default: null },

}, { timestamps: true });

// Ensure both bloomLevelMap and legacy typo field blommLevelMap stay in sync
PaperSchema.pre('save', function(next) {
  if (this.bloomLevelMap && !this.blommLevelMap) {
    this.blommLevelMap = this.bloomLevelMap;
  } else if (this.blommLevelMap && !this.bloomLevelMap) {
    this.bloomLevelMap = this.blommLevelMap;
  }
  next();
});

const PaperInfo = mongoose.model('PaperInfo', PaperSchema);

module.exports = PaperInfo;
