// ─── bcrypt ────────────────────────────────────────────────────
// Single source of truth for all password hashing.
// 10 rounds ≈ 50–80 ms on modern hardware — good balance for a
// web app. Raise to 12 only if you accept ~4x slower logins.
const BCRYPT_ROUNDS = 10;

// ─── Password policy ───────────────────────────────────────────
// Every place that accepts a password MUST apply the same rule:
//   • at least 8 characters
//   • at least one lowercase letter
//   • at least one uppercase letter
//   • at least one digit
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a digit.';

function isStrongPassword(pw) {
  return typeof pw === 'string' && PASSWORD_REGEX.test(pw);
}

// ─── Role assignment ───────────────────────────────────────────
// Roles a college admin / super-admin endpoint is allowed to hand out.
// `super_admin` is intentionally excluded — it can only be created
// by the seed script, never through an HTTP endpoint.
const ASSIGNABLE_ROLES = ['teacher', 'reviewer', 'admin'];

module.exports = {
  BCRYPT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_ERROR_MESSAGE,
  isStrongPassword,
  ASSIGNABLE_ROLES,
};