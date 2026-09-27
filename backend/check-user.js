require('dotenv').config();
const m = require('mongoose');
m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./Model/user');
  const u = await U.findOne({ email: 'faculty@wce.ac.in' }, { email: 1, role: 1 }).lean();
  console.log(u);
  process.exit(0);
});
