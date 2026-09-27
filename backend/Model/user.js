const mongoose = require('mongoose');

// Required for every teacher, affiliated or not
const isTeacher = function () { return this.role === 'teacher'; };

// Required only when the teacher is affiliated with a college
const isAffiliatedTeacher = function () {
    return this.role === 'teacher' && !!this.collegeId;
};

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
        enum: ['teacher', 'reviewer', 'admin', 'super_admin', 'student'],
        default: 'teacher'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: false,
        default: null
    },

    // --- Teacher-specific profile fields ---
    fullName: {
        type: String,
        required: isTeacher,
        trim: true,
        minlength: 2,
        maxlength: 100,
        default: ''
    },
    phone: {
        type: String,
        required: false,
        match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
        unique: true,
        sparse: true,
    },
    collegeName: {
        type: String,
        required: isAffiliatedTeacher,
        trim: true,
        default: ''
    },
    position: {
        type: String,
        required: isTeacher,
        enum: [
            'Professor',
            'Associate Professor',
            'Assistant Professor',
            'Lecturer',
            'HoD',
            'Other',
            ''
        ],
        default: ''
    },
    employeeId: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        sparse: true,
    },
    department: {
        type: String,
        required: isAffiliatedTeacher,
        trim: true,
        default: ''
    },
    stream: {
        type: String,
        required: isAffiliatedTeacher,
        enum: [
            'Engineering',
            'Management',
            'Science',
            'Commerce',
            'Arts',
            'Law',
            'Medicine',
            'Other',
            ''
        ],
        default: ''
    },
    collegeIdPhoto: { type: String, required: false, default: '' },

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
    },

    // --- Email verification (Phase 2) ---
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        default: null,
        select: false,
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
        select: false,
    },

    // --- College approval workflow (Phase A) ---
    collegeApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_applicable'],
    default: 'approved',
    index: true,
},
    pendingAffiliationRequest: {
        collegeId:      { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
        requestedAt:    { type: Date, default: null },
        idVerification: { type: Object, default: null },
    },

}, { timestamps: true });

// Pre-save hook: Enforce role-based college rules
userSchema.pre('save', function (next) {
    if (this.role === 'super_admin') {
        this.collegeId = null;
        this.collegeName = '';
        this.collegeApprovalStatus = 'not_applicable';
    }
    else if (this.role === 'student') {
        this.collegeId = null;
        this.collegeName = '';
        this.collegeApprovalStatus = 'approved';
    }
    else if (this.role === 'teacher') {
        if (this.collegeId) {
            // Affiliated — must be admin-approved.
            // Do NOT clobber an admin's decision.
            if (!this.collegeApprovalStatus || this.collegeApprovalStatus === 'not_applicable') {
                this.collegeApprovalStatus = 'pending';
            }
        } else if (this.pendingAffiliationRequest?.collegeId) {
            // Independent teacher with an in-flight affiliation request — keep pending
            this.collegeApprovalStatus = 'pending';
        } else {
            // Fully independent teacher — auto-approved, UNLESS the caller
            // explicitly set 'pending' (preserve user intent / manual state)
            if (!this.collegeApprovalStatus || this.collegeApprovalStatus === 'not_applicable') {
                this.collegeApprovalStatus = 'approved';
            }
        }
    }
    else if (this.role === 'reviewer' || this.role === 'admin') {
        if (!this.collegeId) {
            return next(new Error(`College is required for ${this.role} role`));
        }
        this.collegeApprovalStatus = 'approved';
    }
    else {
        this.collegeApprovalStatus = 'approved';
    }

    next();
});

// Indexes
userSchema.index({ collegeId: 1 });
userSchema.index({ employeeId: 1, collegeName: 1 });
userSchema.index({ collegeId: 1, collegeApprovalStatus: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);