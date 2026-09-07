/**
 * Seed Script for Test Users
 * 
 * This script is meant to be run ONCE to seed test users into the database.
 * It's NOT run during normal server startup.
 * 
 * Usage:
 * npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./Model/user');

const testUsers = [
  {
    userName: 'TestUser1',
    email: 'test@user1.com',
    password: 'password123',
    fullName: 'Dr. John Doe',
    phone: '9876543210',
    collegeName: 'National Institute of Technology',
    position: 'Professor',
    employeeId: 'EMP001',
    department: 'Computer Science',
    stream: 'Engineering',
    collegeIdPhoto: 'https://placehold.co/400x300?text=ID+Card+1',
    idVerification: {
      status: 'verified',
      extractedData: {
        fullName: 'Dr. John Doe',
        employeeId: 'EMP001',
        collegeName: 'National Institute of Technology',
        department: 'Computer Science',
      },
      matchedFields: ['fullName', 'employeeId', 'collegeName', 'department'],
      confidence: 100,
      updatedAt: new Date()
    }
  },
  {
    userName: 'TestUser2',
    email: 'test@user2.com',
    password: 'password123',
    fullName: 'Prof. Jane Smith',
    phone: '9876543211',
    collegeName: 'Indian Institute of Technology',
    position: 'Associate Professor',
    employeeId: 'EMP002',
    department: 'Electrical Engineering',
    stream: 'Engineering',
    collegeIdPhoto: 'https://placehold.co/400x300?text=ID+Card+2',
    idVerification: {
      status: 'verified',
      extractedData: {
        fullName: 'Prof. Jane Smith',
        employeeId: 'EMP002',
        collegeName: 'Indian Institute of Technology',
        department: 'Electrical Engineering',
      },
      matchedFields: ['fullName', 'employeeId', 'collegeName', 'department'],
      confidence: 100,
      updatedAt: new Date()
    }
  },
  {
    userName: 'TestUser3',
    email: 'test@user3.com',
    password: 'password123',
    fullName: 'Dr. Alan Turing',
    phone: '9876543212',
    collegeName: 'Delhi University',
    position: 'Assistant Professor',
    employeeId: 'EMP003',
    department: 'Mathematics',
    stream: 'Science',
    collegeIdPhoto: 'https://placehold.co/400x300?text=ID+Card+3',
    idVerification: {
      status: 'verified',
      extractedData: {
        fullName: 'Dr. Alan Turing',
        employeeId: 'EMP003',
        collegeName: 'Delhi University',
        department: 'Mathematics',
      },
      matchedFields: ['fullName', 'employeeId', 'collegeName', 'department'],
      confidence: 100,
      updatedAt: new Date()
    }
  },
  {
    userName: 'TestUser4',
    email: 'test@user4.com',
    password: 'password123',
    fullName: 'Prof. Ada Lovelace',
    phone: '9876543213',
    collegeName: 'BITS Pilani',
    position: 'HoD',
    employeeId: 'EMP004',
    department: 'Information Technology',
    stream: 'Engineering',
    collegeIdPhoto: 'https://placehold.co/400x300?text=ID+Card+4',
    idVerification: {
      status: 'verified',
      extractedData: {
        fullName: 'Prof. Ada Lovelace',
        employeeId: 'EMP004',
        collegeName: 'BITS Pilani',
        department: 'Information Technology',
      },
      matchedFields: ['fullName', 'employeeId', 'collegeName', 'department'],
      confidence: 100,
      updatedAt: new Date()
    }
  },
  {
    userName: 'TestUser5',
    email: 'test@user5.com',
    password: 'password123',
    fullName: 'Dr. Grace Hopper',
    phone: '9876543214',
    collegeName: 'Anna University',
    position: 'Lecturer',
    employeeId: 'EMP005',
    department: 'Computer Applications',
    stream: 'Engineering',
    collegeIdPhoto: 'https://placehold.co/400x300?text=ID+Card+5',
    idVerification: {
      status: 'verified',
      extractedData: {
        fullName: 'Dr. Grace Hopper',
        employeeId: 'EMP005',
        collegeName: 'Anna University',
        department: 'Computer Applications',
      },
      matchedFields: ['fullName', 'employeeId', 'collegeName', 'department'],
      confidence: 100,
      updatedAt: new Date()
    }
  },
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Seed each test user
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });

      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const newUser = new User({
          ...userData,
          password: hashedPassword,
        });

        await newUser.save();
        console.log(`✅ User ${userData.email} created successfully`);
      } else {
        console.log(`⚠️ User ${userData.email} already exists - skipping`);
      }
    }

    console.log('\nSeeding complete!');
    console.log('\nTest Accounts:');
    testUsers.forEach(user => {
      console.log(`  - Email: ${user.email}, Password: ${user.password}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedUsers();
