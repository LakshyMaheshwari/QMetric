'use strict';

const { sendMail } = require('./mailer');

// ============================================================
// Layout
// ============================================================
const BRAND = 'QMetric';
const BRAND_COLOR = '#4f46e5';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Wrap content in a professional, email-client-safe HTML shell.
 * All styles inline (Gmail/Outlook strip <style> tags).
 */
function layout({ title, body }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:${BRAND_COLOR};padding:20px 32px;color:#ffffff;font-size:20px;font-weight:600;">
            ${BRAND}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;font-size:15px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;">
            This is an automated message from ${BRAND}. Please do not reply.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href, label) {
    return `<p style="text-align:center;margin:28px 0;">
      <a href="${href}" style="display:inline-block;padding:12px 24px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">${label}</a>
    </p>`;
}

// ============================================================
// Templates (functions returning { subject, html, text })
// ============================================================

function tplNewUser({ fullName, email, tempPassword, loginUrl }) {
    const subject = `Welcome to ${BRAND}`;
    const body = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Your ${BRAND} account has been created. Here are your login details:</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Email:</strong> ${email}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Temporary password:</strong> <code>${tempPassword}</code></td></tr>
      </table>
      <p><strong>Please change your password after your first login.</strong></p>
      ${button(loginUrl, 'Log in to ' + BRAND)}
      <p style="color:#6b7280;font-size:13px;">If you didn't request this account, please contact your administrator.</p>`;
    const text = `Welcome to ${BRAND}\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nLog in: ${loginUrl}\n\nPlease change your password after first login.`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplVerifyEmail({ fullName, verifyUrl, expiry }) {
    const subject = `Verify your ${BRAND} email`;
    const body = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Thanks for signing up to ${BRAND}. Please confirm your email address to activate all features.</p>
      ${button(verifyUrl, 'Verify email')}
      <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:<br><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#6b7280;font-size:13px;">This link expires in ${expiry}.</p>
      <p style="color:#6b7280;font-size:13px;">If you didn't create this account, you can safely ignore this email.</p>`;
    const text = `Verify your ${BRAND} email\n\n${verifyUrl}\n\nThis link expires in ${expiry}.`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplPaperApproved({ paperTitle, courseCode, reviewerName, qualityScore, url }) {
    const subject = `Paper approved: ${paperTitle}`;
    const body = `
      <p>Good news — your paper has been approved.</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Paper:</strong> ${paperTitle}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Course code:</strong> ${courseCode || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reviewer:</strong> ${reviewerName || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Quality score:</strong> ${qualityScore ?? '—'}</td></tr>
      </table>
      ${button(url, 'View paper')}`;
    const text = `Paper approved: ${paperTitle}\nReviewer: ${reviewerName}\nScore: ${qualityScore}\n${url}`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplPaperRejected({ paperTitle, courseCode, reviewerName, reason, comments, url }) {
    const subject = `Paper needs attention: ${paperTitle}`;
    const body = `
      <p>Your paper was reviewed and has been marked as <strong>rejected</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Paper:</strong> ${paperTitle}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Course code:</strong> ${courseCode || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reviewer:</strong> ${reviewerName || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reason:</strong> ${reason || '—'}</td></tr>
      </table>
      ${comments ? `<p><strong>Reviewer comments:</strong></p><blockquote style="border-left:3px solid #e5e7eb;margin:0;padding:8px 16px;color:#4b5563;">${comments}</blockquote>` : ''}
      ${button(url, 'View details')}`;
    const text = `Paper rejected: ${paperTitle}\nReason: ${reason}\nComments: ${comments}\n${url}`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplPaperNeedsRevision({ paperTitle, courseCode, reviewerName, changes, deadline, url }) {
    const subject = `Revision requested: ${paperTitle}`;
    const body = `
      <p>Your paper requires revisions before it can be approved.</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Paper:</strong> ${paperTitle}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Course code:</strong> ${courseCode || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Reviewer:</strong> ${reviewerName || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Deadline:</strong> ${deadline || 'As soon as possible'}</td></tr>
      </table>
      ${changes ? `<p><strong>Required changes:</strong></p><blockquote style="border-left:3px solid #e5e7eb;margin:0;padding:8px 16px;color:#4b5563;">${changes}</blockquote>` : ''}
      ${button(url, 'Open paper')}`;
    const text = `Revision requested: ${paperTitle}\nChanges: ${changes}\nDeadline: ${deadline}\n${url}`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplReviewerAssigned({ reviewerName, paperTitle, courseCode, teacherName, questionCount, url }) {
    const subject = `New paper assigned: ${paperTitle}`;
    const body = `
      <p>Hi ${reviewerName || 'there'},</p>
      <p>A paper has been assigned to you for review.</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Paper:</strong> ${paperTitle}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Course code:</strong> ${courseCode || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Teacher:</strong> ${teacherName || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Questions:</strong> ${questionCount ?? '—'}</td></tr>
      </table>
      ${button(url, 'Review now')}`;
    const text = `New paper assigned: ${paperTitle}\nTeacher: ${teacherName}\n${url}`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplBulkRegistrationSummary({ adminName, totalCreated, totalFailed, totalSkipped, failedList }) {
    const subject = `Bulk registration complete — ${totalCreated} created`;
    const failedRows = Array.isArray(failedList) && failedList.length
        ? `<ul style="color:#4b5563;font-size:13px;">${failedList
              .slice(0, 20)
              .map((f) => `<li>${f.email || '(no email)'} — ${f.reason || 'unknown'}</li>`)
              .join('')}</ul>`
        : '<p style="color:#6b7280;">No failures.</p>';
    const body = `
      <p>Hi ${adminName || 'there'},</p>
      <p>Your bulk registration run completed.</p>
      <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="padding:4px 0;"><strong>Created:</strong> ${totalCreated}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Skipped:</strong> ${totalSkipped || 0}</td></tr>
        <tr><td style="padding:4px 0;"><strong>Failed:</strong> ${totalFailed || 0}</td></tr>
      </table>
      <p><strong>Failures:</strong></p>
      ${failedRows}`;
    const text = `Bulk registration: ${totalCreated} created, ${totalFailed} failed, ${totalSkipped} skipped.`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplTeacherApproved({ fullName, collegeName }) {
    const subject = `Your QMetric affiliation with ${collegeName} is approved`;
    const body = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Good news — your affiliation with <strong>${collegeName}</strong> has been approved.</p>
      <p>You can now:</p>
      <ul>
        <li>Submit papers for college review</li>
        <li>Download full reports and certificates</li>
        <li>Access all teacher features</li>
      </ul>
      ${button(`${FRONTEND_URL}/teacher/papers`, 'Open dashboard')}
      <p style="color:#6b7280;font-size:13px;">If you didn't request this, contact your college admin.</p>`;
    const text = `Your affiliation with ${collegeName} has been approved.\n\nOpen your dashboard: ${FRONTEND_URL}/teacher/papers`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplTeacherRejected({ fullName, collegeName, reason }) {
    const subject = `Update on your ${collegeName} affiliation request`;
    const body = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Your affiliation request with <strong>${collegeName}</strong> was not approved at this time.</p>
      <p><strong>Reason:</strong></p>
      <blockquote style="border-left:3px solid #e5e7eb;margin:0;padding:8px 16px;color:#4b5563;">${reason || 'No reason provided.'}</blockquote>
      <p>You can continue using QMetric as an <strong>independent teacher</strong> — upload papers, view analysis, and download reports.</p>
      <p>If you believe this was a mistake, please contact your college administrator directly.</p>
      ${button(`${FRONTEND_URL}/profile`, 'View profile')}`;
    const text = `Your affiliation with ${collegeName} was not approved.\nReason: ${reason || 'Not specified.'}\n\nYou can continue using QMetric as an independent teacher.`;
    return { subject, html: layout({ title: subject, body }), text };
}

function tplWelcomeAffiliatedTeacher({ fullName, collegeName }) {
    const subject = `Welcome to QMetric — awaiting approval from ${collegeName}`;
    const body = `
      <p>Hi ${fullName || 'there'},</p>
      <p>Your account has been created. Your affiliation request with <strong>${collegeName}</strong> is now <strong>awaiting admin approval</strong>.</p>
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>Your college admin will review your request</li>
        <li>You'll receive an email once a decision is made</li>
        <li>Typical turnaround: 1–2 business days</li>
      </ul>
      <p>While waiting, you can log in to view your profile, but some features (like submitting papers for review) are locked until approval.</p>
      ${button(`${FRONTEND_URL}/login`, 'Log in to QMetric')}
      <p style="color:#6b7280;font-size:13px;">Questions? Contact your college administrator.</p>`;
    const text = `Welcome to QMetric.\nYour affiliation with ${collegeName} is awaiting admin approval.\nYou'll be notified once a decision is made.`;
    return { subject, html: layout({ title: subject, body }), text };
}

// ============================================================
// Service methods — all fire-and-forget, never throw
// ============================================================

async function _send(to, { subject, html, text }) {
    try {
        if (!to) return { success: false, error: 'No recipient' };
        await sendMail({ to, subject, html, text });
        console.log(`[emailService] Sent "${subject}" to ${to}`);
        return { success: true };
    } catch (err) {
        console.error(`[emailService] Failed to send "${subject}" to ${to}:`, err.message);
        return { success: false, error: err.message };
    }
}

exports.sendNewUserEmail = (user, tempPassword) =>
    _send(user.email, tplNewUser({
        fullName: user.fullName || user.userName,
        email: user.email,
        tempPassword: tempPassword || '(password set by admin)',
        loginUrl: `${FRONTEND_URL}/login`,
    }));

exports.sendVerificationEmail = (email, token, fullName) =>
    _send(email, tplVerifyEmail({
        fullName,
        verifyUrl: `${FRONTEND_URL}/auth/verify/${token}`,
        expiry: '24 hours',
    }));

exports.sendPaperApprovedEmail = ({ to, paperTitle, courseCode, reviewerName, qualityScore, paperId }) =>
    _send(to, tplPaperApproved({
        paperTitle, courseCode, reviewerName, qualityScore,
        url: `${FRONTEND_URL}/teacher/papers/${paperId}`,
    }));

exports.sendPaperRejectedEmail = ({ to, paperTitle, courseCode, reviewerName, reason, comments, paperId }) =>
    _send(to, tplPaperRejected({
        paperTitle, courseCode, reviewerName, reason, comments,
        url: `${FRONTEND_URL}/teacher/papers/${paperId}`,
    }));

exports.sendPaperNeedsRevisionEmail = ({ to, paperTitle, courseCode, reviewerName, changes, deadline, paperId }) =>
    _send(to, tplPaperNeedsRevision({
        paperTitle, courseCode, reviewerName, changes, deadline,
        url: `${FRONTEND_URL}/teacher/papers/${paperId}`,
    }));

exports.sendReviewerAssignedEmail = ({ to, reviewerName, paperTitle, courseCode, teacherName, questionCount, paperId }) =>
    _send(to, tplReviewerAssigned({
        reviewerName, paperTitle, courseCode, teacherName, questionCount,
        url: `${FRONTEND_URL}/reviewer/papers/${paperId}`,
    }));

exports.sendBulkRegistrationSummary = ({ to, adminName, totalCreated, totalFailed, totalSkipped, failedList }) =>
    _send(to, tplBulkRegistrationSummary({
        adminName, totalCreated, totalFailed, totalSkipped, failedList,
    }));

exports.sendTeacherApprovedEmail = (email, fullName, collegeName) =>
    _send(email, tplTeacherApproved({ fullName, collegeName }));

exports.sendTeacherRejectedEmail = (email, fullName, collegeName, reason) =>
    _send(email, tplTeacherRejected({ fullName, collegeName, reason }));

exports.sendWelcomeAffiliatedTeacherEmail = (email, fullName, collegeName) =>
    _send(email, tplWelcomeAffiliatedTeacher({ fullName, collegeName }));