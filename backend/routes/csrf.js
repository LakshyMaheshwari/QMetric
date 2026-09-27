const express = require('express');
const router = express.Router();
const { generateCsrfToken } = require('../middleware/csrf');

// GET /api/csrf-token
// Guarantees the CSRF cookie is set on the response and returns the token
// in the body so the frontend has a synchronous handle.
// Safe/idempotent: if the client already has a valid cookie, echo it back.
router.get('/csrf-token', (req, res) => {
  // Always issue a fresh token and cookie on the bootstrap endpoint.
  // This is the single source of truth for CSRF issuance.
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

module.exports = router;