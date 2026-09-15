const mongoose = require('mongoose');
require('dotenv').config();

async function dropPhoneIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    const phoneIdx = indexes.find(idx => idx.key && idx.key.phone === 1);
    if (phoneIdx) {
      await collection.dropIndex(phoneIdx.name);
      console.log('Dropped index:', phoneIdx.name);
    } else {
      console.log('Phone index not found, nothing to drop');
    }
  } catch (err) {
    console.error('Error dropping phone index:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

dropPhoneIndex();
