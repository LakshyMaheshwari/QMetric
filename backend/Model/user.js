const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // --- Existing fields (required) ---
    userName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },

    // --- New teacher profile fields (required) ---
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    phone: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/,  // Indian phone format
        unique: true,
        sparse: true
    },
    collegeName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },
    position: {
        type: String,
        required: true,
        enum: [
            'Professor',
            'Associate Professor',
            'Assistant Professor',
            'Lecturer',
            'HoD',
            'Other'
        ]
    },
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
        sparse: true
    },
    department: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    stream: {
        type: String,
        required: true,
        enum: [
            'Engineering',
            'Management',
            'Science',
            'Commerce',
            'Arts',
            'Law',
            'Medicine',
            'Other'
        ]
    },
    collegeIdPhoto: {
        type: String,  // Cloudinary secure_url
        required: true,
        default: null
    },

    // --- OCR ID Verification sub-document ---
    idVerification: {
        status: {
            type: String,
            enum: ['verified', 'flagged', 'unverified'],
            default: 'unverified'
        },
        extractedData: {
            fullName: { type: String, default: '' },
            employeeId: { type: String, default: '' },
            collegeName: { type: String, default: '' },
            department: { type: String, default: '' }
        },
        matchedFields: {
            type: [String],
            default: []
        },
        confidence: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        ocrRawText: {
            type: String,
            default: ''
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }

}, { timestamps: true });

// Indexes for faster lookups
userSchema.index({ employeeId: 1, collegeName: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);