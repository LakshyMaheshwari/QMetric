const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(async () => {
    const U = require('./Model/user');
    const u = await U.find(
      { role: { $in: ['reviewer', 'admin', 'super_admin'] } },
      { email: 1, role: 1, fullName: 1 }
    ).limit(10).lean();
    console.log(JSON.stringify(u, null, 2));
    process.exit(0);
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
