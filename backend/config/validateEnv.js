const REQUIRED = [
  'MONGO_URI',
  'ACCESS_TOKEN_SECRET',
  'CSRF_SECRET',
  'ADMIN_SECRET_KEY',
  'TURNSTILE_SECRET_KEY',
  'FRONTEND_URL',
  'CLOUDINARY_URL',
];

const RECOMMENDED = [
  'PORT',
  'NODE_ENV',
];

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('\n❌ Missing required env vars:');
    missing.forEach((k) => console.error(`   - ${k}`));
    console.error('\n   Add them to backend/.env and restart.\n');
    process.exit(1);
  }

  // Reject obvious placeholder values
  const placeholders = ['changeme', 'change-me', 'your-secret-here', 'xxx', 'secret'];
  const sus = REQUIRED.filter((k) => {
    const v = String(process.env[k] || '').toLowerCase();
    return placeholders.some((p) => v === p || v === `${p}-in-production`);
  });
  if (sus.length > 0) {
    console.error('\n❌ Placeholder values detected in:');
    sus.forEach((k) => console.error(`   - ${k}`));
    console.error('\n   Generate real secrets:\n');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED.filter((k) => !process.env[k]);
  if (missingRecommended.length > 0) {
    console.warn('⚠️  Missing recommended env vars:', missingRecommended.join(', '));
  }

  console.log('✅ Environment variables validated');
}

module.exports = validateEnv;