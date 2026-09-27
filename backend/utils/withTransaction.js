const mongoose = require('mongoose');

let _supported = null;

/**
 * Detect transaction support by inspecting the server topology.
 *
 * Replica sets expose `setName`; sharded clusters return `msg: 'isdbgrid'`.
 * Standalone mongod (including mongodb-memory-server) supports neither.
 *
 * Note: We do NOT use the startTransaction/abortTransaction probe because
 * on MongoDB 4+ those calls succeed on standalone — the error only surfaces
 * on the first operation inside the transaction.
 */
async function detectTransactionSupport() {
  if (_supported !== null) return _supported;

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    _supported = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch (err) {
    console.warn(
      '[withTransaction] Failed to detect topology: ' + err.message +
      ' — falling back to non-atomic writes.'
    );
    _supported = false;
  }

  return _supported;
}

async function withTransaction(fn) {
  const supported = await detectTransactionSupport();

  if (!supported) {
    // Pass `undefined` (not null) so downstream `.session(undefined)` is
    // a no-op rather than a Mongoose 8 throw.
    return fn(undefined);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

module.exports = { withTransaction, detectTransactionSupport };