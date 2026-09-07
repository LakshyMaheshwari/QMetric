const mongoose = require('mongoose');

// Helper: field is required only for teachers (not for admins/reviewers)
const teacherOnly = function () { return this.role === 'teacher'; };

const userSchema = new mongoose.Schema({
    // --- Core fields (required for ALL roles) ---
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
    role: {
        type: String,
        enum: ['teacher', 'reviewer', 'admin'],
        default: 'teacher'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },

    // --- Teacher-specific profile fields (NOT required for admin/reviewer) ---
    fullName: {
        type: String,
        required: teacherOnly,
        trim: true,
        minlength: 2,
        maxlength: 100,
        default: ''
    },
    phone: {
        type: String,
        required: false,      // Optional — teachers fill this via register form
        match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
        unique: true,
        sparse: true,         // Allows multiple null values (admins won't have phone)
        default: null
    },
    collegeName: {
        type: String,
        required: teacherOnly,
        trim: true,
        default: ''
    },
    position: {
        type: String,
        required: teacherOnly,
        enum: [
            'Professor',
            'Associate Professor',
            'Assistant Professor',
            'Lecturer',
            'HoD',
            'Other',
            ''              // Allow empty for non-teacher roles
        ],
        default: ''
    },
    employeeId: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        sparse: true,         // Allows multiple null/missing values
        default: null
    },
    department: {
        type: String,
        required: teacherOnly,
        trim: true,
        default: ''
    },
    stream: {
        type: String,
        required: teacherOnly,
        enum: [
            'Engineering',
            'Management',
            'Science',
            'Commerce',
            'Arts',
            'Law',
            'Medicine',
            'Other',
            ''              // Allow empty for non-teacher roles
        ],
        default: ''
    },
    collegeIdPhoto: {
        type: String,         // Cloudinary secure_url
        required: teacherOnly,
        default: ''
    },

    // --- OCR ID Verification (teachers only — admins skip this) ---
    idVerification: {
        status: {
            type: String,
            enum: ['verified', 'flagged', 'unverified', 'not_applicable'],
            default: 'unverified'
        },
        extractedData: {
            fullName:    { type: String, default: '' },
            employeeId:  { type: String, default: '' },
            collegeName: { type: String, default: '' },
            department:  { type: String, default: '' }
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