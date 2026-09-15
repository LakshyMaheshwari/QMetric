require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Model/user');

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'superadmin@qmetric.com';
    const rawPassword = 'superadmin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Check if super admin exists
    const existing = await User.findOne({ role: 'super_admin' });
    if (existing) {
      console.log(`Found existing super admin (${existing.email}). Updating to detach from any college...`);
      existing.collegeId = null;
      existing.collegeName = '';
      existing.password = hashedPassword;
      await existing.save();

      console.log('✅ Super Admin updated successfully!');
      console.log('📧 Email:', existing.email);
      console.log('🔑 Password:', rawPassword);
      console.log('🌍 Role: Super Admin (collegeId: null - manages ALL colleges)');
      process.exit(0);
    }

    // Super admin does NOT need a college
    const admin = new User({
      userName: 'Super Admin',
      fullName: 'Global Super Admin',
      email: email,
      password: hashedPassword,
      role: 'super_admin',
      collegeId: null,
      collegeName: '',
      idVerification: { status: 'not_applicable' },
    });

    await admin.save();
    console.log('✅ Super Admin created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${rawPassword}`);
    console.log('🌍 Role: Super Admin (collegeId: null - manages ALL colleges)');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
