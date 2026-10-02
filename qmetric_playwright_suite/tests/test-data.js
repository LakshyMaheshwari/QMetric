const accounts = {
  superAdmin: { email: 'superadmin@qmetric.test', role: 'super_admin' },
  admin1: { email: 'admin1@qmetric.test', role: 'admin', collegeCode: 'QMC01' },
  admin2: { email: 'admin2@qmetric.test', role: 'admin', collegeCode: 'QMC02' },
  admin3: { email: 'admin3@qmetric.test', role: 'admin', collegeCode: 'QMC03' },
  reviewer1: { email: 'reviewer1@qmetric.test', role: 'reviewer', collegeCode: 'QMC01' },
  reviewer2: { email: 'reviewer2@qmetric.test', role: 'reviewer', collegeCode: 'QMC02' },
  reviewer3: { email: 'reviewer3@qmetric.test', role: 'reviewer', collegeCode: 'QMC03' },
  teacher1: { email: 'teacher1@qmetric.test', role: 'teacher', collegeCode: 'QMC01' },
  teacher2: { email: 'teacher2@qmetric.test', role: 'teacher', collegeCode: 'QMC02' },
  independent1: { email: 'independent1@qmetric.test', role: 'teacher', collegeCode: null },
  independent2: { email: 'independent2@qmetric.test', role: 'teacher', collegeCode: null },
  student1: { email: 'student1@qmetric.test', role: 'student', collegeCode: null },
  student2: { email: 'student2@qmetric.test', role: 'student', collegeCode: null },
  student3: { email: 'student3@qmetric.test', role: 'student', collegeCode: null },
};

module.exports = {
  DEMO_PASSWORD: process.env.QMETRIC_DEMO_PASSWORD || 'QMetricDemo@123',
  accounts,
  colleges: [
    { code: 'QMC01', name: 'QMetric Demo College 1' },
    { code: 'QMC02', name: 'QMetric Demo College 2' },
    { code: 'QMC03', name: 'QMetric Demo College 3' },
    { code: 'QMC04', name: 'QMetric Demo College 4' },
    { code: 'QMC05', name: 'QMetric Demo College 5' },
  ],
  courses: {
    approved: { code: 'CS301', name: 'Data Structures and Algorithms', status: 'approved', score: 88 },
    pending: { code: 'CS302', name: 'Database Management Systems', status: 'pending', score: 76 },
    revision: { code: 'CS303', name: 'Operating Systems', status: 'needs_revision', score: 68 },
    rejected: { code: 'CS304', name: 'Computer Networks', status: 'rejected', score: 61 },
  },
};
