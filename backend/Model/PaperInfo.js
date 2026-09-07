const mongoose = require('mongoose');

const PaperSchema = new mongoose.Schema({
  "College Name": { type: String, required: true },
  "Branch": { type: String, required: true },
  "Year Of Study": { type: String, required: true },
  "Semester": { type: String, required: true },
  "Course Name": { type: String, required: true },
  "Course Code": { type: String, required: true },
  "Course Teacher": { type: String, required: true },
  "Sequence": [],
  "Collected Data":[],
  "blommLevelMap": { type: Object },
  "bloomLevelMap": { type: Object },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
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
