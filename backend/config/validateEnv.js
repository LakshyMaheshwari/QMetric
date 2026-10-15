const logger = require('./logger');

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
];

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    logger.error('\n❌ Missing required env vars:');
    missing.forEach((k) => logger.error(`   - ${k}`));
    logger.error('\n   Add them to backend/.env and restart.\n');
    process.exit(1);
  }

  // Reject obvious placeholder values
  const placeholders = ['changeme', 'change-me', 'your-secret-here', 'xxx', 'secret'];
  const sus = REQUIRED.filter((k) => {
    const v = String(process.env[k] || '').toLowerCase();
    return placeholders.some((p) => v === p || v === `${p}-in-production`);
  });
  if (sus.length > 0) {
    logger.error('\n❌ Placeholder values detected in:');
    sus.forEach((k) => logger.error(`   - ${k}`));
    logger.error('\n   Generate real secrets:\n');
    logger.error('   node -e "logger.info(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    process.exit(1);
  }

  // NODE_ENV must be explicit. When unset, HSTS and Secure cookies are OFF and
  // the dev-auth bypass could mount — a silent production misconfiguration.
  const VALID_NODE_ENVS = ['development', 'test', 'production'];
  if (!VALID_NODE_ENVS.includes(process.env.NODE_ENV)) {
    logger.error(`\n❌ NODE_ENV must be one of: ${VALID_NODE_ENVS.join(', ')} (got: ${process.env.NODE_ENV || 'unset'})\n`);
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === 'production';

  // Reject the literal values shipped in .env.example
  const EXAMPLE_VALUES = [
    'your_jwt_secret_key_here',
    'replace-with-64-char-random-hex-string',
  ];
  const SECRET_KEYS = ['ACCESS_TOKEN_SECRET', 'CSRF_SECRET', 'ADMIN_SECRET_KEY'];
  const exampleHits = SECRET_KEYS.filter((k) =>
    EXAMPLE_VALUES.includes(String(process.env[k] || '').trim().toLowerCase())
  );
  if (exampleHits.length > 0) {
    logger.error('\n❌ .env.example values detected in:', exampleHits.join(', '));
    process.exit(1);
  }

  // Minimum secret strength — enforced in production, warned about elsewhere
  // (the Jest env uses short throwaway secrets).
  const MIN_SECRET_LENGTH = 32;
  const weak = SECRET_KEYS.filter((k) => String(process.env[k] || '').length < MIN_SECRET_LENGTH);
  if (weak.length > 0) {
    const msg = `Secrets shorter than ${MIN_SECRET_LENGTH} chars: ${weak.join(', ')}`;
    if (isProd) {
      logger.error(`\n❌ ${msg}\n`);
      process.exit(1);
    }
    logger.warn(`⚠️  ${msg}`);
  }

  // Cloudflare's published always-pass Turnstile secret disables CAPTCHA entirely.
  if (isProd && String(process.env.TURNSTILE_SECRET_KEY || '').startsWith('1x0000000000000000000000000000000')) {
    logger.error('\n❌ TURNSTILE_SECRET_KEY is the Cloudflare always-pass TEST key. Use a real key in production.\n');
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED.filter((k) => !process.env[k]);
  if (missingRecommended.length > 0) {
    logger.warn('⚠️  Missing recommended env vars:', missingRecommended.join(', '));
  }

  logger.info('✅ Environment variables validated');
}

module.exports = validateEnv;