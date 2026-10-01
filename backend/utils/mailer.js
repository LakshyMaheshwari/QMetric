const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// ─── Startup warning (fires once, at module load) ─────────────────
if (!process.env.SMTP_HOST) {
  logger.warn('[mailer] SMTP not configured — email notifications are DISABLED (console fallback active)');
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    // Dev / no-SMTP fallback — logs the email instead of sending it
    transporter = {
      sendMail: async (mailOptions) => {
        logger.debug({ subject: mailOptions.subject }, 'Email notification simulated');
        return { messageId: 'simulated-id' };
      },
    };
  }

  return transporter;
}

/**
 * Send an email notification to teacher when review status is updated
 */
async function sendReviewStatusEmail({ to, courseName, reviewStatus, comments }) {
  try {
    const client = getTransporter();
    const from = process.env.FROM_EMAIL || '"QMetric System" <noreply@qmetric.edu>';

    const subject = `[QMetric] Your paper "${courseName}" review status: ${reviewStatus.toUpperCase()}`;
    const text = `Hello,\n\nYour question paper for "${courseName}" has been updated to "${reviewStatus}".\n\nComments: ${comments || 'No comments provided.'}\n\nPlease login to QMetric to view the full details.\n\nRegards,\nQMetric Team`;

    return await client.sendMail({
      from,
      to,
      subject,
      text,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send review status email');
  }
}

/**
 * Generic mail sender. Throws on failure (callers should wrap in try/catch).
 */
async function sendMail({ to, subject, html, text, from }) {
    const client = getTransporter();
    return client.sendMail({
        from: from || process.env.FROM_EMAIL || '"QMetric System" <noreply@qmetric.edu>',
        to,
        subject,
        html,
        text,
    });
}

module.exports = {
  sendReviewStatusEmail,
  sendMail,
};