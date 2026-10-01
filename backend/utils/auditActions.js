'use strict';

/**
 * Single source of truth for AuditLog action names.
 *
 * AuditLog.action is a free-form String (no Mongoose enum) so a new action can
 * never be silently dropped by schema validation again. tests/auditActions.test.js
 * fails if any `action: '...'` literal in controllers/ is missing from this list.
 *
 * Naming convention going forward: UPPER_SNAKE_CASE. The lower.dotted values
 * are legacy strings already stored in existing documents — keep them as-is.
 */
const AUDIT_ACTIONS = Object.freeze({
  // Auth
  LOGIN: 'LOGIN',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED',
  LOGOUT: 'LOGOUT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  REGISTER_STUDENT: 'REGISTER_STUDENT',
  REGISTER_TEACHER_AFFILIATED: 'REGISTER_TEACHER_AFFILIATED',
  REGISTER_TEACHER_INDEPENDENT: 'REGISTER_TEACHER_INDEPENDENT',
  REQUEST_AFFILIATION: 'REQUEST_AFFILIATION',
  UPGRADE_TO_TEACHER: 'UPGRADE_TO_TEACHER',
  CREATE_ACCOUNT: 'CREATE_ACCOUNT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  BULK_REGISTER: 'BULK_REGISTER',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  RESET_PASSWORD: 'RESET_PASSWORD',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  REVOKE_ALL_SESSIONS: 'REVOKE_ALL_SESSIONS',

  // User administration
  CREATE_USER: 'CREATE_USER',
  CREATE_ADMIN: 'CREATE_ADMIN',
  UPDATE_ROLE: 'UPDATE_ROLE',
  BLOCK_USER: 'BLOCK_USER',
  UNBLOCK_USER: 'UNBLOCK_USER',
  DELETE_USER: 'DELETE_USER',
  APPROVE_TEACHER: 'APPROVE_TEACHER',
  REJECT_TEACHER: 'REJECT_TEACHER',

  // Papers
  UPLOAD_PAPER: 'UPLOAD_PAPER',
  REVIEW_PAPER: 'REVIEW_PAPER',
  APPROVE_PAPER: 'APPROVE_PAPER',
  REJECT_PAPER: 'REJECT_PAPER',
  RESEND_REVIEW_EMAIL: 'RESEND_REVIEW_EMAIL',

  // Colleges
  CREATE_COLLEGE: 'CREATE_COLLEGE',
  UPDATE_COLLEGE: 'UPDATE_COLLEGE',
  DELETE_COLLEGE: 'DELETE_COLLEGE',

  // Learned verbs
  LEARNED_VERB_CREATED: 'LEARNED_VERB_CREATED',
  LEARNED_VERB_UPDATED: 'LEARNED_VERB_UPDATED',
  LEARNED_VERB_DELETED: 'LEARNED_VERB_DELETED',
  LEARNED_VERB_BULK_IMPORT: 'LEARNED_VERB_BULK_IMPORT',

  // Legacy lower.dotted strings (already persisted — do not rename)
  OCR_MANUAL_VERIFY: 'ocr_log.manual_verify',
  OCR_MANUAL_REJECT: 'ocr_log.manual_reject',
  VQ_CORRECTION_SUBMITTED: 'verified_question.correction_submitted',
  VQ_CORRECTION_UPDATED: 'verified_question.correction_updated',
  VQ_CORRECTION_DELETED: 'verified_question.correction_deleted',
});

const AUDIT_ACTION_VALUES = Object.freeze(Object.values(AUDIT_ACTIONS));

module.exports = { AUDIT_ACTIONS, AUDIT_ACTION_VALUES };
