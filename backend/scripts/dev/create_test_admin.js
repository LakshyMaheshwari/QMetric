const logger = require('../../config/logger');

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./Model/user');
const College = require('./Model/College');
const { withTransaction } = require('./utils/withTransaction');

async function createTestCollegeAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB');

  // Find or create sample college
  let college = await College.findOne({ code: 'WCE001' });
  if (!college) {
    college = await College.create({
      name: 'Walchand College of Engineering',
      code: 'WCE001',
      city: 'Sangli',
      state: 'Maharashtra',
      address: 'Vishrambag, Sangli',
      isActive: true,
    });
    logger.info('Created college:', college.name);
  } else {
    logger.info('Using college:', college.name, '(', college.code, ')');
  }

  const email = process.env.TEST_ADMIN_EMAIL || 'collegeadmin@wce.ac.in';
  const rawPassword = process.env.TEST_ADMIN_PASSWORD || 'change-me-in-production';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  // Check if test admin already exists
  let adminUser = await User.findOne({ email });
  if (adminUser) {
    adminUser.password = hashedPassword;
    adminUser.role = 'admin';
    adminUser.collegeId = college._id;
    adminUser.collegeName = college.name;
    adminUser.isBlocked = false;
    await adminUser.save();
    logger.info('Updated existing college admin:', email);
  } else {
    adminUser = new User({
      userName: 'WCE Admin',
      fullName: 'Prof. WCE Admin',
      email: email,
      password: hashedPassword,
      role: 'admin',
      collegeId: college._id,
      collegeName: college.name,
      department: 'Dean Academics',
      position: 'Professor',
      phone: '9998887771',
      employeeId: 'ADM-WCE-001',
      isBlocked: false,
      idVerification: { status: 'not_applicable' },
    });
    await adminUser.save();
    logger.info('Created new college admin:', email);
  }

  // Ensure this admin is in College.adminIds
  if (!college.adminIds.includes(adminUser._id)) {
    college.adminIds.push(adminUser._id);
    await college.save();
    logger.info('Added admin reference to college adminIds');
  }

  // ── Create sample teacher (atomic: user + counter) ─────────
  const sampleTeacherEmail = process.env.TEST_TEACHER_EMAIL || 'faculty@wce.ac.in';

  let teacher = await User.findOne({ email: sampleTeacherEmail });
  if (!teacher) {
    const teacherPassword = await bcrypt.hash(
      process.env.TEST_TEACHER_PASSWORD || 'change-me-in-production',
      salt
    );

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      const [created] = await User.create([{
        userName: 'Dr. Anand Joshi',
        fullName: 'Dr. Anand Joshi',
        email: sampleTeacherEmail,
        password: teacherPassword,
        role: 'teacher',
        collegeId: college._id,
        collegeName: college.name,
        department: 'Computer Science & Engineering',
        position: 'Professor',
        phone: '9822012345',
        employeeId: 'WCE-CSE-101',
        stream: 'Engineering',
        isBlocked: false,
        idVerification: { status: 'verified', confidence: 95 },
      }], opts);

      teacher = created;

      // Same transaction — user and counter commit or roll back together
      await College.findByIdAndUpdate(
        college._id,
        { $inc: { totalTeachers: 1 } },
        opts
      );
    });

    logger.info('Created sample teacher for WCE:', sampleTeacherEmail);
  }

  logger.info('\n=======================================');
  logger.info('   COLLEGE ADMIN CREDENTIALS CREATED   ');
  logger.info('=======================================');
  logger.info('Email:    ' + email);
  logger.info('Password: ' + rawPassword);
  logger.info('Role:     ' + adminUser.role);
  logger.info('College:  ' + college.name + ' (' + college.code + ')');
  logger.info('=======================================\n');

  await mongoose.disconnect();
}

createTestCollegeAdmin().catch(console.error);