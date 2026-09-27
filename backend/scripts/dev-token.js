require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: node scripts/dev-token.js <email>');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('-password');
    if (!user) {
        console.error('User not found');
        await mongoose.disconnect();
        process.exit(1);
    }

    const token = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET);
    console.log(token);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
