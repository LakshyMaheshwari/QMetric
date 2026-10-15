const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(async () => {
    const U = require('./Model/user');
    const b = require('bcrypt');
    const h = b.hashSync('Test1234!', 10);
    const r = await U.updateOne({ email: process.argv[2] }, { $set: { password: h } });
    console.log(r);
    process.exit(0);
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
