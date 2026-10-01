const logger = require('./config/logger');

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Model/user');

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    const email = process.env.SEED_SUPER_ADMIN_EMAIL;
    const rawPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;

    if (!email || !rawPassword) {
      throw new Error(
        'SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are required.'
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Check if super admin exists
    const existing = await User.findOne({ role: 'super_admin' });

    if (existing) {
      logger.info(
        `Found existing super admin (${existing.email}). Updating to detach from any college...`
      );

      existing.collegeId = null;
      existing.collegeName = '';
      existing.password = hashedPassword;

      await existing.save();

      logger.info('✅ Super Admin updated successfully!');
      logger.info(`📧 Email: ${existing.email}`);
      logger.info(
        '🌍 Role: Super Admin (collegeId: null - manages ALL colleges)'
      );

      process.exit(0);
    }

    // Super admin does NOT need a college
    const admin = new User({
      userName: 'Super Admin',
      fullName: 'Global Super Admin',
      email,
      password: hashedPassword,
      role: 'super_admin',
      collegeId: null,
      collegeName: '',
      idVerification: { status: 'not_applicable' },
    });

    await admin.save();

    logger.info('✅ Super Admin created successfully!');
    logger.info(`📧 Email: ${email}`);
    logger.info(
      '🌍 Role: Super Admin (collegeId: null - manages ALL colleges)'
    );

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin().catch((err) => {
  logger.error({ err }, 'Unhandled error in seedSuperAdmin');
  process.exit(1);
});