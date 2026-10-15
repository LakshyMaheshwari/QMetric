'use strict';

require('dotenv').config();

const mongoose = require('mongoose');

const User = require('../../Model/user');
const College = require('../../Model/College');
const Paper = require('../../Model/PaperInfo');

const courseTemplates = [
  {
    code: 'CS301',
    name: 'Data Structures and Algorithms',
    branch: 'CSE',
    year: '3',
    semester: '5',
    score: 88,
  },
  {
    code: 'CS302',
    name: 'Database Management Systems',
    branch: 'CSE',
    year: '3',
    semester: '5',
    score: 76,
  },
  {
    code: 'CS303',
    name: 'Operating Systems',
    branch: 'CSE',
    year: '3',
    semester: '6',
    score: 68,
  },
  {
    code: 'CS304',
    name: 'Computer Networks',
    branch: 'CSE',
    year: '3',
    semester: '6',
    score: 61,
  },
];

const statuses = [
  'approved',
  'pending',
  'needs_revision',
  'rejected',
];

function makeCollectedData(template) {
  return [
    {
      Questions: [
        {
          questionNo: 1,
          question: `Explain the key concepts of ${template.name}.`,
          bloomLevel: 'understand',
          marks: 10,
        },
        {
          questionNo: 2,
          question: `Apply the concepts of ${template.name} to a practical problem.`,
          bloomLevel: 'apply',
          marks: 10,
        },
        {
          questionNo: 3,
          question: `Analyze a real-world scenario related to ${template.name}.`,
          bloomLevel: 'analyze',
          marks: 10,
        },
      ],
      totalQuestions: 3,
      totalMarks: 30,
    },
  ];
}

function makeBloomMap() {
  return {
    '1': {
      level: 1,
      name: 'remember',
      weights: 20,
      marks: 6,
      No_Of_Questions: 0,
    },
    '2': {
      level: 2,
      name: 'understand',
      weights: 30,
      marks: 10,
      No_Of_Questions: 1,
    },
    '3': {
      level: 3,
      name: 'apply',
      weights: 30,
      marks: 8,
      No_Of_Questions: 1,
    },
    '4': {
      level: 4,
      name: 'analyze',
      weights: 20,
      marks: 6,
      No_Of_Questions: 1,
    },
    '5': {
      level: 5,
      name: 'evaluate',
      weights: 0,
      marks: 0,
      No_Of_Questions: 0,
    },
    '6': {
      level: 6,
      name: 'create',
      weights: 0,
      marks: 0,
      No_Of_Questions: 0,
    },
  };
}

function makeReviewData(status, reviewer) {
  if (status === 'pending') {
    return {
      submittedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      reviewComments: '',
      reviewHistory: [],
    };
  }

  const comments = {
    approved: 'Paper reviewed and approved for academic use.',
    needs_revision: 'Please revise the Bloom distribution and question wording.',
    rejected: 'Paper requires substantial revision before approval.',
  };

  return {
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    reviewedBy: reviewer._id,
    reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    reviewComments: comments[status] || '',
    reviewHistory: [
      {
        reviewerId: reviewer._id,
        action: status,
        comments: comments[status] || '',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  };
}

async function upsertPaper({
  teacher,
  college,
  reviewer,
  template,
  status,
}) {
  const paperData = {
    'College Name': college ? college.name : 'Independent',
    Branch: template.branch,
    'Year Of Study': template.year,
    Semester: template.semester,
    'Course Name': template.name,
    'Course Code': template.code,
    'Course Teacher': teacher.fullName || teacher.userName,

    userId: teacher._id,
    collegeId: college ? college._id : null,

    Sequence: {
      COs: {
        CO1: 30,
        CO2: 30,
        CO3: 40,
      },
      ModuleHours: {
        M1: 10,
        M2: 10,
        M3: 10,
      },
    },

    'Collected Data': makeCollectedData(template),

    bloomLevelMap: makeBloomMap(),

    BloomRecommendations: [
      {
        level: 'apply',
        suggestion: 'Increase application-oriented questions.',
      },
      {
        level: 'analyze',
        suggestion: 'Maintain stronger analytical coverage.',
      },
    ],

    appliedCorrections: [],

    correctionsSummary: null,

    qualityScore: template.score,

    reviewStatus: status,

    fileUrl: '',
    cloudinaryPublicId: null,

    ...makeReviewData(status, reviewer),
  };

  const paper = await Paper.findOneAndUpdate(
    {
      userId: teacher._id,
      'Course Code': template.code,
    },
    {
      $set: paperData,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return paper;
}

async function seedDemoPapers() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Demo paper seeding is disabled in production.'
    );
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log('Connected to MongoDB.');
  console.log('Seeding QMetric demo papers...\n');

  // ------------------------------------------------------------
  // 1. College papers
  // ------------------------------------------------------------

  for (let i = 1; i <= 5; i++) {
    const college = await College.findOne({
      code: `QMC0${i}`,
    });

    const teacher = await User.findOne({
      email: `teacher${i}@qmetric.test`,
      role: 'teacher',
    });

    const reviewer = await User.findOne({
      email: `reviewer${i}@qmetric.test`,
      role: 'reviewer',
    });

    if (!college || !teacher || !reviewer) {
      throw new Error(
        `Missing demo data for college ${i}. Run npm run seed:demo first.`
      );
    }

    for (let j = 0; j < courseTemplates.length; j++) {
      await upsertPaper({
        teacher,
        college,
        reviewer,
        template: courseTemplates[j],
        status: statuses[j],
      });
    }

    console.log(
      `College ${i}: seeded ${courseTemplates.length} papers`
    );
  }

  // ------------------------------------------------------------
  // 2. Independent teacher papers
  // ------------------------------------------------------------

  for (let i = 1; i <= 2; i++) {
    const teacher = await User.findOne({
      email: `independent${i}@qmetric.test`,
      role: 'teacher',
    });

    if (!teacher) {
      throw new Error(
        `independent${i}@qmetric.test not found. Run npm run seed:demo first.`
      );
    }

    await upsertPaper({
      teacher,
      college: null,
      reviewer: teacher,
      template: {
        ...courseTemplates[0],
        code: `IND${i}01`,
        name: `Independent Data Analysis ${i}`,
        score: 73,
      },
      status: 'draft',
    });

    await upsertPaper({
      teacher,
      college: null,
      reviewer: teacher,
      template: {
        ...courseTemplates[1],
        code: `IND${i}02`,
        name: `Independent Machine Learning ${i}`,
        score: 81,
      },
      status: 'draft',
    });

    console.log(
      `Independent teacher ${i}: seeded 2 papers`
    );
  }

  // ------------------------------------------------------------
  // 3. Student papers
  // ------------------------------------------------------------

  for (let i = 1; i <= 3; i++) {
    const student = await User.findOne({
      email: `student${i}@qmetric.test`,
      role: 'student',
    });

    if (!student) {
      throw new Error(
        `student${i}@qmetric.test not found. Run npm run seed:demo first.`
      );
    }

    await upsertPaper({
      teacher: student,
      college: null,
      reviewer: student,
      template: {
        ...courseTemplates[0],
        code: `STU${i}01`,
        name: `Student Demo Paper ${i}`,
        score: 65 + i * 5,
      },
      status: 'draft',
    });

    console.log(
      `Student ${i}: seeded 1 paper`
    );
  }

  console.log('\n========================================');
  console.log('Demo papers ready');
  console.log('========================================');
  console.log('5 colleges × 4 papers = 20 papers');
  console.log('2 independent teachers × 2 = 4 papers');
  console.log('3 students × 1 = 3 papers');
  console.log('Total = 27 demo papers');
}

seedDemoPapers()
  .catch((error) => {
    console.error('Demo paper seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
  