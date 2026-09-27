const m = require('mongoose');
require('dotenv').config();
m.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(async () => {
    const U = require('./Model/user');
    const auth = require('./core/auth/utilities');
    const user = await U.findOne({ email: process.argv[2] }).lean();
    if (!user) { console.error('User not found'); process.exit(1); }

    // Try the common export shapes for token generation
    let token;
    if (typeof auth.generateToken === 'function') {
      token = auth.generateToken(user);
    } else if (typeof auth.generateAccessToken === 'function') {
      token = auth.generateAccessToken(user);
    } else if (typeof auth.signToken === 'function') {
      token = auth.signToken(user);
    } else if (typeof auth === 'function') {
      token = auth(user);
    } else if (auth.default && typeof auth.default.generateToken === 'function') {
      token = auth.default.generateToken(user);
    } else {
      console.error('Could not find token generator. Exports:', Object.keys(auth));
      process.exit(1);
    }

    console.log(token);
    process.exit(0);
  })
  .catch((e) => { console.error(e.message); process.exit(1); });
