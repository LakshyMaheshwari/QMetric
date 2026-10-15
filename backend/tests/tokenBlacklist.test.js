const { revoke, isRevoked } = require('../utils/tokenBlacklist');

describe('Token blacklist', () => {
  it('revokes a token', async () => {
    const token = `test-token-${Date.now()}-1`;
    await revoke(token, Math.floor(Date.now() / 1000) + 60);
    await expect(isRevoked(token)).resolves.toBe(true);
  });

  it('does not revoke an unrelated token', async () => {
    const token = `test-token-${Date.now()}-2`;
    await expect(isRevoked(token)).resolves.toBe(false);
  });

  it('uses the fallback expiry when no exp is provided', async () => {
    const token = `test-token-${Date.now()}-3`;
    await revoke(token);
    await expect(isRevoked(token)).resolves.toBe(true);
  });
});
