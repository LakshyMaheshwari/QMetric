const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const CollegeApplication = require('../Model/CollegeApplication');
const College = require('../Model/College');
const User = require('../Model/user');
const { createNotification } = require('./notificationController');
const { BCRYPT_ROUNDS, isStrongPassword, PASSWORD_ERROR_MESSAGE } = require('../config/security');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { withTransaction } = require('../utils/withTransaction');
const { logAudit } = require('../utils/auditLog');
const escapeRegex = require('../utils/escapeRegex');

const cleanApplication = (application) => {
  if (!application) return null;
  const data = application.toObject ? application.toObject() : application;
  delete data.adminPasswordHash;
  return data;
};

const validateApplicationInput = ({ collegeName, collegeCode, contactName, contactEmail, contactPhone, password }) => {
  if (!collegeName?.trim() || !collegeCode?.trim() || !contactName?.trim() || !contactEmail?.trim() || !contactPhone || !password) {
    return 'College name, college code, contact name, email, phone, and password are required.';
  }
  if (collegeName.trim().length < 2 || collegeName.trim().length > 200) {
    return 'College name must be between 2 and 200 characters.';
  }
  if (!/^[A-Za-z0-9]+$/.test(collegeCode.trim())) {
    return 'College code must contain only letters and numbers.';
  }
  if (!validator.isEmail(contactEmail.trim())) {
    return 'Invalid contact email format.';
  }
  if (!/^[0-9]{10}$/.test(String(contactPhone))) {
    return 'Contact phone must be exactly 10 digits.';
  }
  if (!isStrongPassword(password)) {
    return PASSWORD_ERROR_MESSAGE;
  }
  return null;
};

// POST /auth/college-applications — public college/exam-cell registration request
const submitCollegeApplication = async (req, res) => {
  try {
    const {
      collegeName,
      collegeCode,
      address = '',
      city = '',
      state = '',
      contactName,
      contactEmail,
      contactPhone,
      password,
    } = req.body || {};

    const validationError = validateApplicationInput({
      collegeName, collegeCode, contactName, contactEmail, contactPhone, password,
    });
    if (validationError) {
      return res.status(400).json({ error: true, message: validationError });
    }

    const normalizedName = collegeName.trim();
    const normalizedCode = collegeCode.trim().toUpperCase();
    const normalizedEmail = contactEmail.trim().toLowerCase();
    const normalizedPhone = String(contactPhone).trim();

    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: 'This email address is already registered with QMetric.',
      });
    }

    const existingCollege = await College.findOne({
      $or: [
        { code: normalizedCode },
        { name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' } },
      ],
    }).select('_id').lean();
    if (existingCollege) {
      return res.status(409).json({
        error: true,
        message: 'A college with this name or code is already registered.',
      });
    }

    const duplicatePending = await CollegeApplication.findOne({
      status: 'pending',
      $or: [
        { collegeCode: normalizedCode },
        { contactEmail: normalizedEmail },
        { collegeName: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' } },
      ],
    }).select('_id').lean();
    if (duplicatePending) {
      return res.status(409).json({
        error: true,
        message: 'A pending application already exists for this college or contact email.',
      });
    }

    const adminPasswordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const application = await CollegeApplication.create({
      collegeName: normalizedName,
      collegeCode: normalizedCode,
      address: String(address || '').trim(),
      city: String(city || '').trim(),
      state: String(state || '').trim(),
      contactName: contactName.trim(),
      contactEmail: normalizedEmail,
      contactPhone: normalizedPhone,
      adminPasswordHash,
    });

    await logAudit({
      userId: null,
      actorType: 'system',
      action: 'SUBMIT_COLLEGE_APPLICATION',
      resource: `CollegeApplication:${application._id}`,
      changes: {
        newValue: {
          collegeName: application.collegeName,
          collegeCode: application.collegeCode,
          contactEmail: application.contactEmail,
        },
        fields: ['collegeName', 'collegeCode', 'contactEmail'],
      },
      request: req,
    });

    try {
      const superAdmins = await User.find({ role: 'super_admin', isBlocked: false }).select('_id').lean();
      for (const admin of superAdmins) {
        createNotification({
          userId: admin._id,
          type: 'system',
          title: 'New college registration application',
          message: `${application.collegeName} (${application.collegeCode}) has been submitted for review by ${application.contactName}.`,
          relatedDocId: application._id,
          actionUrl: `/super-admin/college-applications`,
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('Super admin notification dispatch failed (non-blocking):', notifErr.message);
    }

    return res.status(201).json({
      error: false,
      message: 'College registration request submitted for review.',
      application: {
        _id: application._id,
        collegeName: application.collegeName,
        collegeCode: application.collegeCode,
        status: application.status,
        createdAt: application.createdAt,
      },
    });
  } catch (err) {
    console.error('submitCollegeApplication error:', err);
    return res.status(500).json({ error: true, message: 'Server error submitting college application.' });
  }
};

// GET /auth/college-applications/:id — public status lookup by application id
const getPublicApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: true, message: 'Invalid application id.' });
    }

    const application = await CollegeApplication.findById(id)
      .select('collegeName collegeCode status rejectionReason createdAt reviewedAt')
      .lean();

    if (!application) {
      return res.status(404).json({ error: true, message: 'Application not found.' });
    }

    return res.json({ error: false, application });
  } catch (err) {
    console.error('getPublicApplicationStatus error:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching application status.' });
  }
};

// GET /super-admin/college-applications
const getApplications = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req, 20, 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const status = ['pending', 'approved', 'rejected', 'all'].includes(req.query.status) ? req.query.status : 'pending';

    const query = {};
    if (status !== 'all') query.status = status;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { collegeName: new RegExp(safe, 'i') },
        { collegeCode: new RegExp(safe, 'i') },
        { contactName: new RegExp(safe, 'i') },
        { contactEmail: new RegExp(safe, 'i') },
      ];
    }

    const [applications, total] = await Promise.all([
      CollegeApplication.find(query)
        .select('-adminPasswordHash')
        .populate('reviewedBy', 'userName fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CollegeApplication.countDocuments(query),
    ]);

    return res.json({
      error: false,
      applications,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (err) {
    console.error('getApplications error:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching college applications.' });
  }
};

// PUT /super-admin/college-applications/:id/approve
const approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.userId;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: true, message: 'Invalid application id.' });
    }

    const application = await CollegeApplication.findById(id).select('+adminPasswordHash');
    if (!application) return res.status(404).json({ error: true, message: 'Application not found.' });
    if (application.status !== 'pending') {
      return res.status(409).json({ error: true, message: 'Application is no longer pending.' });
    }

    const existingCollege = await College.findOne({
      $or: [
        { code: application.collegeCode },
        { name: { $regex: `^${escapeRegex(application.collegeName)}$`, $options: 'i' } },
      ],
    }).select('_id').lean();
    if (existingCollege) {
      return res.status(409).json({ error: true, message: 'A college with this name or code already exists.' });
    }

    const existingAdmin = await User.findOne({ email: application.contactEmail }).select('_id').lean();
    if (existingAdmin) {
      return res.status(409).json({ error: true, message: 'The contact email is already registered as a user.' });
    }

    const result = await withTransaction(async (session) => {
      const createDocs = (Model, data) => session
        ? Model.create([data], { session }).then((docs) => docs[0])
        : Model.create(data);
      const saveDoc = (doc) => session ? doc.save({ session }) : doc.save();
      const withSession = (query) => {
        if (session) query.session(session);
        return query;
      };

      const college = await createDocs(College, {
        name: application.collegeName,
        code: application.collegeCode,
        address: application.address,
        city: application.city,
        state: application.state,
        isActive: true,
      });

      const admin = await createDocs(User, {
        userName: application.contactEmail.split('@')[0].slice(0, 50),
        fullName: application.contactName,
        email: application.contactEmail,
        password: application.adminPasswordHash,
        role: 'admin',
        collegeId: college._id,
        collegeName: college.name,
        department: 'Administration',
        idVerification: { status: 'not_applicable' },
      });

      college.adminIds = [admin._id];
      await saveDoc(college);

      const updated = await withSession(CollegeApplication.findOneAndUpdate(
        { _id: application._id, status: 'pending' },
        {
          $set: {
            status: 'approved',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            createdCollegeId: college._id,
            createdAdminId: admin._id,
            rejectionReason: '',
          },
        },
        { new: true },
      ));

      return { college, admin, updated };
    });

    if (!result.updated) {
      return res.status(409).json({ error: true, message: 'Application was already processed.' });
    }

    await logAudit({
      userId: reviewerId,
      action: 'APPROVE_COLLEGE_APPLICATION',
      resource: `CollegeApplication:${application._id}`,
      changes: {
        oldValue: { status: 'pending' },
        newValue: { status: 'approved', collegeId: result.college._id, adminId: result.admin._id },
        fields: ['status', 'createdCollegeId', 'createdAdminId'],
      },
      request: req,
    });

    return res.json({
      error: false,
      message: 'College application approved and college admin account created.',
      application: cleanApplication(result.updated),
      college: {
        _id: result.college._id,
        name: result.college.name,
        code: result.college.code,
      },
      admin: {
        _id: result.admin._id,
        fullName: result.admin.fullName,
        email: result.admin.email,
      },
    });
  } catch (err) {
    console.error('approveApplication error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: true, message: 'A college or user with the submitted details already exists.' });
    }
    return res.status(500).json({ error: true, message: 'Server error approving college application.' });
  }
};

// PUT /super-admin/college-applications/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.userId;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: true, message: 'Invalid application id.' });
    }
    if (!reason) {
      return res.status(400).json({ error: true, message: 'Rejection reason is required.' });
    }
    if (reason.length > 500) {
      return res.status(400).json({ error: true, message: 'Reason must be 500 characters or less.' });
    }

    const updated = await CollegeApplication.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).select('-adminPasswordHash');

    if (!updated) {
      const existing = await CollegeApplication.findById(id).select('status').lean();
      if (!existing) return res.status(404).json({ error: true, message: 'Application not found.' });
      return res.status(409).json({ error: true, message: 'Application is no longer pending.' });
    }

    await logAudit({
      userId: reviewerId,
      action: 'REJECT_COLLEGE_APPLICATION',
      resource: `CollegeApplication:${updated._id}`,
      changes: {
        oldValue: { status: 'pending' },
        newValue: { status: 'rejected', reason },
        fields: ['status', 'rejectionReason'],
      },
      request: req,
    });

    return res.json({
      error: false,
      message: 'College application rejected.',
      application: cleanApplication(updated),
    });
  } catch (err) {
    console.error('rejectApplication error:', err);
    return res.status(500).json({ error: true, message: 'Server error rejecting college application.' });
  }
};

module.exports = {
  submitCollegeApplication,
  getPublicApplicationStatus,
  getApplications,
  approveApplication,
  rejectApplication,
};
