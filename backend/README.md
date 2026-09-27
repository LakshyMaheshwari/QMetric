## Deployment

Set the following environment variables in your hosting provider's dashboard
(Render, Railway, Fly.io, etc.) — do NOT rely on `.env` being present on the
server. See `.env.example` for the full list and required formats.

Required:
- MONGO_URI
- ACCESS_TOKEN_SECRET  (64 hex chars)
- CSRF_SECRET          (64 hex chars)
- ADMIN_SECRET_KEY     (64 hex chars)
- TURNSTILE_SECRET_KEY
- CLOUDINARY_URL
- FRONTEND_URL

Optional:
- PORT (defaults to 5000)
- NODE_ENV (set to "production" in prod)
- REDIS_URL (leave empty for single-instance; required for multi-instance)

## Security Considerations

- Passwords are hashed with bcrypt (10 rounds).
- JWT tokens are signed with `ACCESS_TOKEN_SECRET` and can be revoked on logout.
- PII (phone, fullName, employeeId) is stored in plaintext. Rely on MongoDB
  Atlas encryption-at-rest, or enable field-level encryption before
  handling user data subject to GDPR/HIPAA/PCI requirements.