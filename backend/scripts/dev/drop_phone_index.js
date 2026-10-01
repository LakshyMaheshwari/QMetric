const logger = require('../../config/logger');

const mongoose = require('mongoose');
require('dotenv').config();

async function dropPhoneIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');
    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    const phoneIdx = indexes.find(idx => idx.key && idx.key.phone === 1);
    if (phoneIdx) {
      await collection.dropIndex(phoneIdx.name);
      logger.info('Dropped index:', phoneIdx.name);
    } else {
      logger.info('Phone index not found, nothing to drop');
    }
  } catch (err) {
    logger.error('Error dropping phone index:', err);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected');
  }
}

dropPhoneIndex();
