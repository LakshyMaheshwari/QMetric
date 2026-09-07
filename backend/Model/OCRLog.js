const mongoose = require('mongoose');

/**
 * OCRLog — stores full OCR verification data for each teacher registration.
 *
 * Why a separate collection?
 * - Keeps User documents lean (no large ocrRawText blob).
 * - Enables TTL-based auto-deletion after 90 days.
 * - Makes audit queries faster (indexed by userId).
 */
const ocrLogSchema = new mongoose.Schema({
    // Reference to the registered User
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true           // fast lookups by user
    },

    // Exactly what the user typed at registration time
    userInput: {
        fullName:    { type: String, default: '' },
        employeeId:  { type: String, default: '' },
        collegeName: { type: String, default: '' },
        department:  { type: String, default: '' }
    },

    // Values extracted from OCR (via regex or fallback)
    extractedData: {
        fullName:    { type: String, default: '' },
        employeeId:  { type: String, default: '' },
        collegeName: { type: String, default: '' },
        department:  { type: String, default: '' }
    },

    // Fields that successfully matched (user input ↔ OCR)
    matchedFields: {
        type: [String],
        default: []
    },

    // Final verification outcome
    status: {
        type: String,
        enum: ['verified', 'flagged', 'unverified'],
        default: 'unverified'
    },

    // Confidence score (0–100)
    confidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    // Full raw OCR text from Cloudinary (can be large — lives here, not in User)
    ocrRawText: {
        type: String,
        default: ''
    },

    // Cloudinary image URL for manual review
    imageUrl: {
        type: String,
        default: ''
    },

    // Auto-populated timestamp; also used by the TTL index below
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ── TTL Index ─────────────────────────────────────────────────────────────────
// MongoDB will automatically delete OCRLog documents 90 days after createdAt.
// No cron job needed.
ocrLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }   // 90 days = 7,776,000 seconds
);

module.exports = mongoose.model('OCRLog', ocrLogSchema);
