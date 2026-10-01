const { doubleCsrf } = require('csrf-csrf');

// Skip CSRF in test environment
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    generateCsrfToken: () => 'test-csrf-token',
    doubleCsrfProtection: (req, res, next) => next(),
    csrfWithBearerSkip: (req, res, next) => next(),
  };
} else {
  const {
    generateCsrfToken,
    doubleCsrfProtection: rawDoubleCsrfProtection,
  } = doubleCsrf({
    // Secret used to sign the CSRF token
    getSecret: () => process.env.CSRF_SECRET || process.env.ACCESS_TOKEN_SECRET,

    // Bind token to the auth cookie when present (stable per session).
    // Falls back to a constant for anonymous users — the token is still
    // validated by the double-submit cookie mechanism, so this doesn't
    // weaken protection.
    getSessionIdentifier: (req) => {
      const auth = req.cookies?.accessToken;
      return auth ? `auth:${auth.slice(-32)}` : 'anon';
    },

    // Cookie name for the CSRF token
    cookieName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: false,          // MUST be false — frontend JS reads it
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },

    // Token size
    size: 64,

    // Methods that skip CSRF (safe methods)
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],

    // How to read the token from the request
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  const doubleCsrfProtection = (req, res, next) => {
    rawDoubleCsrfProtection(req, res, next);
  };

  const csrfWithBearerSkip = (req, res, next) => {
    const authHeader = req.headers && req.headers.authorization;
    // Bearer-token clients (no cookie) are not CSRF-able, so they skip the check.
    // But if the browser ALSO sent the auth cookie, the cookie is what
    // authenticates the request (see authenticateToken), so CSRF must still apply.
    const hasAuthCookie = Boolean(req.cookies && req.cookies.accessToken);
    if (
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ') &&
      !hasAuthCookie
    ) {
      return next();
    }
    return doubleCsrfProtection(req, res, next);
  };

  module.exports = {
    generateCsrfToken,
    doubleCsrfProtection,
    csrfWithBearerSkip,
  };
}