const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./Model/user');
const College = require('./Model/College');

async function createTestCollegeAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find or create sample college
  let college = await College.findOne({ code: 'WCE001' });
  if (!college) {
    college = await College.create({
      name: 'Walchand College of Engineering',
      code: 'WCE001',
      city: 'Sangli',
      state: 'Maharashtra',
      address: 'Vishrambag, Sangli',
      isActive: true
    });
    console.log('Created college:', college.name);
  } else {
    console.log('Using college:', college.name, '(', college.code, ')');
  }

  const email = 'collegeadmin@wce.ac.in';
  const rawPassword = 'adminpassword123';
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
    console.log('Updated existing college admin:', email);
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
      idVerification: { status: 'not_applicable' }
    });
    await adminUser.save();
    console.log('Created new college admin:', email);
  }

  // Ensure this admin is in College.adminIds
  if (!college.adminIds.includes(adminUser._id)) {
    college.adminIds.push(adminUser._id);
    await college.save();
    console.log('Added admin reference to college adminIds');
  }

  // Create sample teacher in the same college
  const sampleTeacherEmail = 'faculty@wce.ac.in';
  let teacher = await User.findOne({ email: sampleTeacherEmail });
  if (!teacher) {
    const teacherPassword = await bcrypt.hash('teacher123', salt);
    teacher = new User({
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
      idVerification: { status: 'verified', confidence: 95 }
    });
    await teacher.save();
    await College.findByIdAndUpdate(college._id, { $inc: { totalTeachers: 1 } });
    console.log('Created sample teacher for WCE:', sampleTeacherEmail);
  }

  console.log('\n=======================================');
  console.log('   COLLEGE ADMIN CREDENTIALS CREATED   ');
  console.log('=======================================');
  console.log('Email:    ' + email);
  console.log('Password: ' + rawPassword);
  console.log('Role:     ' + adminUser.role);
  console.log('College:  ' + college.name + ' (' + college.code + ')');
  console.log('=======================================\n');

  await mongoose.disconnect();
}

createTestCollegeAdmin().catch(console.error);
