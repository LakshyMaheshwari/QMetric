require('dotenv').config();
const m = require('mongoose');
m.connect(process.env.MONGO_URI).then(async () => {
  const U = require('./Model/user');
  const r = await U.updateOne({ email: 'faculty@wce.ac.in' }, { $set: { role: 'super_admin' } });
  console.log(r);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
