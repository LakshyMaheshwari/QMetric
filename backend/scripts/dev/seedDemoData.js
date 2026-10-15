'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../../Model/user');
const College = require('../../Model/College');

const DEMO_PASSWORD =
    process.env.SEED_DEMO_PASSWORD || 'QMetricDemo@123';

const colleges = [
    {
        name: 'QMetric Demo College 1',
        code: 'QMC01',
        address: 'Demo Campus 1',
        city: 'Nagpur',
        state: 'Maharashtra',
    },
    {
        name: 'QMetric Demo College 2',
        code: 'QMC02',
        address: 'Demo Campus 2',
        city: 'Nagpur',
        state: 'Maharashtra',
    },
    {
        name: 'QMetric Demo College 3',
        code: 'QMC03',
        address: 'Demo Campus 3',
        city: 'Nagpur',
        state: 'Maharashtra',
    },
    {
        name: 'QMetric Demo College 4',
        code: 'QMC04',
        address: 'Demo Campus 4',
        city: 'Nagpur',
        state: 'Maharashtra',
    },
    {
        name: 'QMetric Demo College 5',
        code: 'QMC05',
        address: 'Demo Campus 5',
        city: 'Nagpur',
        state: 'Maharashtra',
    },
];

async function hashPassword() {
    return bcrypt.hash(DEMO_PASSWORD, 10);
}

async function upsertUser(data) {
    const existing = await User.findOne({ email: data.email });

    if (!existing) {
        const user = new User({
            ...data,
            password: await hashPassword(),
            emailVerified: true,
            isBlocked: false,
        });

        await user.save();

        return user;
    }

    existing.userName = data.userName;
    existing.fullName = data.fullName || '';
    existing.role = data.role;
    existing.collegeId = data.collegeId ?? null;
    existing.collegeName = data.collegeName || '';
    existing.phone = data.phone;
    existing.employeeId = data.employeeId;
    existing.department = data.department || '';
    existing.stream = data.stream || '';
    existing.position = data.position || '';
    existing.emailVerified = true;
    existing.isBlocked = false;
    existing.password = await hashPassword();

    await existing.save();

    return existing;
}

async function seedDemoData() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'Demo seeding is disabled in production.'
        );
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required.');
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('Connected to MongoDB.');
    console.log('Seeding QMetric demo accounts...\n');

    const createdColleges = [];

    // ------------------------------------------------------------
    // 1. Colleges
    // ------------------------------------------------------------

    for (const collegeData of colleges) {
        const college = await College.findOneAndUpdate(
            { code: collegeData.code },
            {
                $set: {
                    ...collegeData,
                    isActive: true,
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        createdColleges.push(college);

        console.log(
            `College ${college.code}: ${college.name}`
        );
    }

    // ------------------------------------------------------------
    // 2. Super admin
    // ------------------------------------------------------------

    const superAdmin = await upsertUser({
        userName: 'demoSuperAdmin',
        email: 'superadmin@qmetric.test',
        fullName: 'QMetric Demo Super Admin',
        role: 'super_admin',
        collegeId: null,
        collegeName: '',
        phone: '9000000001',
        employeeId: undefined,
        department: '',
        stream: '',
        position: '',
    });

    console.log(
        `Super admin: ${superAdmin.email}`
    );

    // ------------------------------------------------------------
    // 3. Admin + reviewer + affiliated teacher
    //    for every college
    // ------------------------------------------------------------

    for (let i = 0; i < createdColleges.length; i++) {
        const college = createdColleges[i];
        const number = i + 1;

        const admin = await upsertUser({
            userName: `demoAdmin${number}`,
            email: `admin${number}@qmetric.test`,
            fullName: `Demo Admin ${number}`,
            role: 'admin',
            collegeId: college._id,
            collegeName: college.name,
            phone: `900000001${number}`,
            employeeId: `ADMIN00${number}`,
            department: 'Administration',
            stream: '',
            position: '',
        });

        const reviewer = await upsertUser({
            userName: `demoReviewer${number}`,
            email: `reviewer${number}@qmetric.test`,
            fullName: `Demo Reviewer ${number}`,
            role: 'reviewer',
            collegeId: college._id,
            collegeName: college.name,
            phone: `900000002${number}`,
            employeeId: `REV00${number}`,
            department: 'Computer Science',
            stream: 'Engineering',
            position: 'Professor',
        });

        const teacher = await upsertUser({
            userName: `demoTeacher${number}`,
            email: `teacher${number}@qmetric.test`,
            fullName: `Demo Teacher ${number}`,
            role: 'teacher',
            collegeId: college._id,
            collegeName: college.name,
            phone: `900000003${number}`,
            employeeId: `TEACH00${number}`,
            department: 'Computer Science',
            stream: 'Engineering',
            position: 'Assistant Professor',
        });

        // Explicitly approved for demo use.
        teacher.collegeApprovalStatus = 'approved';
        teacher.collegeName = college.name;
        await teacher.save();

        // Keep denormalized college membership data correct.
        await College.updateOne(
            { _id: college._id },
            {
                $set: {
                    adminIds: [admin._id],
                    totalTeachers: 1,
                },
            }
        );

        console.log(
            `  College ${number}: admin + reviewer + teacher`
        );
    }

    // ------------------------------------------------------------
    // 4. Independent teachers
    // ------------------------------------------------------------

    for (let i = 1; i <= 2; i++) {
        const teacher = await upsertUser({
            userName: `demoIndependent${i}`,
            email: `independent${i}@qmetric.test`,
            fullName: `Demo Independent Teacher ${i}`,
            role: 'teacher',
            collegeId: null,
            collegeName: '',
            phone: `900000004${i}`,
            employeeId: `INDEP00${i}`,
            department: '',
            stream: '',
            position: 'Other',
        });

        teacher.collegeId = null;
        teacher.collegeName = '';
        teacher.collegeApprovalStatus = 'approved';
        teacher.pendingAffiliationRequest = undefined;

        await teacher.save();

        console.log(
            `Independent teacher ${i}: ${teacher.email}`
        );
    }

    // ------------------------------------------------------------
    // 5. Students
    // ------------------------------------------------------------

    for (let i = 1; i <= 3; i++) {
        const student = await upsertUser({
            userName: `demoStudent${i}`,
            email: `student${i}@qmetric.test`,
            fullName: `Demo Student ${i}`,
            role: 'student',
            collegeId: null,
            collegeName: '',
            phone: `900000005${i}`,
            employeeId: undefined,
            department: '',
            stream: '',
            position: '',
        });

        // Student hook also enforces this.
        student.collegeId = null;
        student.collegeName = '';
        student.collegeApprovalStatus = 'approved';

        await student.save();

        console.log(
            `Student ${i}: ${student.email}`
        );
    }

    console.log('\n========================================');
    console.log('QMetric Demo Accounts Ready');
    console.log('========================================');
    console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);

    console.log('\nSuper Admin');
    console.log('  superadmin@qmetric.test');

    console.log('\nCollege Accounts');
    for (let i = 1; i <= 5; i++) {
        console.log(`  College ${i}`);
        console.log(`    admin${i}@qmetric.test`);
        console.log(`    reviewer${i}@qmetric.test`);
        console.log(`    teacher${i}@qmetric.test`);
    }

    console.log('\nIndependent Teachers');
    console.log('  independent1@qmetric.test');
    console.log('  independent2@qmetric.test');

    console.log('\nStudents');
    console.log('  student1@qmetric.test');
    console.log('  student2@qmetric.test');
    console.log('  student3@qmetric.test');

    console.log('\nDemo account seeding complete.');
}

seedDemoData()
    .catch((error) => {
        console.error('Demo account seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });