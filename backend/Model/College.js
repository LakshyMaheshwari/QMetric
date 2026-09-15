const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'College name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'College code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    adminIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    totalPapers: {
        type: Number,
        default: 0,
        min: 0
    },
    totalTeachers: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Text search index for filtering
collegeSchema.index({ name: 'text', city: 'text', state: 'text' });

module.exports = mongoose.model('College', collegeSchema);
