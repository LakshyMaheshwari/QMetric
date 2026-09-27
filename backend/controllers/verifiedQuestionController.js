'use strict';

const mongoose = require('mongoose');
const VerifiedQuestion = require('../Model/VerifiedQuestion');
const PaperInfo = require('../Model/PaperInfo');
const { withTransaction } = require('../utils/withTransaction');
const { logAudit } = require('../utils/auditLog');
const paperFields = require('../core/constants/paperFields');
const { getUserId, getUserRole, getCollegeId, isSuperAdmin, isAdmin } = require('../utils/currentUser');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_DOMAINS = ['cognitive', 'affective', 'psychomotor'];
const MIN_LEVEL = 1;
const MAX_LEVEL = 7;
const MAX_REASON_LENGTH = 500;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
const ALLOWED_ROLES = ['reviewer', 'admin', 'super_admin'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

/** Super admins bypass college scope; everyone else must match collegeId. */
function canAccessPaper(user, paper) {
  if (!user) return false;
  if (getUserRole(user) === 'super_admin') return true;
  if (!paper || !paper.collegeId) return false;
  return String(paper.collegeId) === String(getCollegeId(user));
}

/** Pull auto-classified fields from a PaperInfo question row (best-effort). */
function pickOriginalClassification(question) {
  if (!question || typeof question !== 'object') {
    return { domain: null, level: null, score: null };
  }
  const domain =
    question.domain ?? question.Domain ?? question.domainName ?? null;
  const level =
    question.bloomLevel ??
    question['Bloom Level'] ??
    question.bloom ??
    question.level ??
    null;
  const score = question.score ?? question.Score ?? null;
  return { domain, level, score };
}

function parsePagination(q) {
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Number.parseInt(q.limit, 10) || DEFAULT_PAGE_LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

// ---------------------------------------------------------------------------
// POST /reviewer/papers/:paperId/corrections
// ---------------------------------------------------------------------------
async function submitCorrection(req, res) {
  try {
    const { paperId } = req.params;
    const {
      questionIndex,
      correctedDomain,
      correctedLevel,
      correctedLevelName,
      reason,
    } = req.body || {};

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthenticated' });
    }
    if (!ALLOWED_ROLES.includes(getUserRole(req))) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }

    // ---- Validation --------------------------------------------------------
    if (!isObjectId(paperId)) {
      return res.status(400).json({ error: true, message: 'Invalid paperId' });
    }
    const qIdx = Number(questionIndex);
    if (!Number.isInteger(qIdx) || qIdx < 0) {
      return res.status(400).json({
        error: true,
        message: 'questionIndex must be a non-negative integer',
      });
    }
    if (!VALID_DOMAINS.includes(correctedDomain)) {
      return res.status(400).json({
        error: true,
        message: `correctedDomain must be one of: ${VALID_DOMAINS.join(', ')}`,
      });
    }
    const lvl = Number(correctedLevel);
    if (!Number.isInteger(lvl) || lvl < MIN_LEVEL || lvl > MAX_LEVEL) {
      return res.status(400).json({
        error: true,
        message: `correctedLevel must be an integer between ${MIN_LEVEL} and ${MAX_LEVEL}`,
      });
    }
    if (
      reason !== undefined &&
      reason !== null &&
      (typeof reason !== 'string' || reason.length > MAX_REASON_LENGTH)
    ) {
      return res.status(400).json({
        error: true,
        message: `reason must be a string of at most ${MAX_REASON_LENGTH} characters`,
      });
    }
    if (
      correctedLevelName !== undefined &&
      correctedLevelName !== null &&
      typeof correctedLevelName !== 'string'
    ) {
      return res.status(400).json({
        error: true,
        message: 'correctedLevelName must be a string',
      });
    }

    // ---- Fetch paper + question -------------------------------------------
    const paper = await PaperInfo.findById(paperId)
      .select({ collegeId: 1, [paperFields.COLLECTED_DATA]: 1 })
      .lean();
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }
    if (!canAccessPaper(req.user, paper)) {
      return res.status(403).json({
        error: true,
        message: 'Forbidden: paper belongs to another college',
      });
    }

    const collected = Array.isArray(paper[paperFields.COLLECTED_DATA])
      ? paper[paperFields.COLLECTED_DATA]
      : [];
    if (qIdx >= collected.length) {
      return res.status(404).json({
        error: true,
        message: `questionIndex ${qIdx} is out of range (paper has ${collected.length} questions)`,
      });
    }

    const original = pickOriginalClassification(collected[qIdx]);

    // ---- Persist (upsert) --------------------------------------------------
    const existing = await VerifiedQuestion.exists({ paperId, questionIndex: qIdx });

    // withTransaction may pass `undefined` (standalone Mongo) — Mongoose
    // treats `session: undefined` as a no-op, so this is safe either way.
    const correctedQuestion = await withTransaction(async (session) => {
      return VerifiedQuestion.findOneAndUpdate(
        { paperId, questionIndex: qIdx },
        {
          $set: {
            paperId,
            questionIndex: qIdx,
            originalDomain: original.domain,
            originalLevel: original.level,
            originalScore: original.score,
            correctedDomain,
            correctedLevel: lvl,
            correctedLevelName: correctedLevelName ?? null,
            correctedBy: userId,
            correctedAt: Date.now(),
            reason: reason ?? null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session,
        }
      );
    });

    // ---- Audit (fire-and-forget, after commit) ----------------------------
    await logAudit({
      userId,
      action: 'verified_question.correction_submitted',
      resource: 'VerifiedQuestion',
      changes: {
        oldValue: { domain: original.domain, level: original.level },
        newValue: { domain: correctedDomain, level: lvl },
        fields: ['correctedDomain', 'correctedLevel'],
      },
      request: req,
    });

    return res.status(existing ? 200 : 201).json({
      error: false,
      correctedQuestion,
      message: existing ? 'Correction updated' : 'Correction submitted',
    });
  } catch (err) {
    console.error('[verifiedQuestion.submitCorrection]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /reviewer/papers/:paperId/corrections
// ---------------------------------------------------------------------------
async function getCorrectionsForPaper(req, res) {
  try {
    const { paperId } = req.params;
    if (!isObjectId(paperId)) {
      return res.status(400).json({ error: true, message: 'Invalid paperId' });
    }

    const paper = await PaperInfo.findById(paperId)
      .select({ collegeId: 1, [paperFields.COURSE_NAME]: 1, teacher: 1 })
      .lean();
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }
    if (!canAccessPaper(req.user, paper)) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [corrections, total] = await Promise.all([
      VerifiedQuestion.find({ paperId })
        .sort({ questionIndex: 1 })
        .skip(skip)
        .limit(limit)
        .populate('correctedBy', 'fullName email')
        .populate({ path: 'paperId', select: { [paperFields.COURSE_NAME]: 1, teacher: 1 } })
        .lean(),
      VerifiedQuestion.countDocuments({ paperId }),
    ]);

    return res.status(200).json({
      error: false,
      corrections,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[verifiedQuestion.getCorrectionsForPaper]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /reviewer/papers/:paperId/corrections/:questionIndex
// ---------------------------------------------------------------------------
async function getSingleCorrection(req, res) {
  try {
    const { paperId, questionIndex } = req.params;
    if (!isObjectId(paperId)) {
      return res.status(400).json({ error: true, message: 'Invalid paperId' });
    }
    const qIdx = Number(questionIndex);
    if (!Number.isInteger(qIdx) || qIdx < 0) {
      return res.status(400).json({
        error: true,
        message: 'questionIndex must be a non-negative integer',
      });
    }

    const paper = await PaperInfo.findById(paperId).select('collegeId').lean();
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }
    if (!canAccessPaper(req.user, paper)) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }

    const correction = await VerifiedQuestion.findOne({
      paperId,
      questionIndex: qIdx,
    })
      .populate('correctedBy', 'fullName email')
      .lean();

    if (!correction) {
      return res.status(404).json({ error: true, message: 'Correction not found' });
    }

    return res.status(200).json({ error: false, correction });
  } catch (err) {
    console.error('[verifiedQuestion.getSingleCorrection]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /reviewer/papers/:paperId/corrections/:questionIndex
// ---------------------------------------------------------------------------
async function updateCorrection(req, res) {
  try {
    const { paperId, questionIndex } = req.params;
    const { correctedDomain, correctedLevel, correctedLevelName, reason } =
      req.body || {};

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthenticated' });
    }

    if (!isObjectId(paperId)) {
      return res.status(400).json({ error: true, message: 'Invalid paperId' });
    }
    const qIdx = Number(questionIndex);
    if (!Number.isInteger(qIdx) || qIdx < 0) {
      return res.status(400).json({
        error: true,
        message: 'questionIndex must be a non-negative integer',
      });
    }

    // ---- Validate provided fields -----------------------------------------
    const $set = { correctedAt: Date.now() };
    if (correctedDomain !== undefined) {
      if (!VALID_DOMAINS.includes(correctedDomain)) {
        return res.status(400).json({
          error: true,
          message: `correctedDomain must be one of: ${VALID_DOMAINS.join(', ')}`,
        });
      }
      $set.correctedDomain = correctedDomain;
    }
    if (correctedLevel !== undefined) {
      const lvl = Number(correctedLevel);
      if (!Number.isInteger(lvl) || lvl < MIN_LEVEL || lvl > MAX_LEVEL) {
        return res.status(400).json({
          error: true,
          message: `correctedLevel must be an integer between ${MIN_LEVEL} and ${MAX_LEVEL}`,
        });
      }
      $set.correctedLevel = lvl;
    }
    if (correctedLevelName !== undefined) {
      $set.correctedLevelName = correctedLevelName;
    }
    if (reason !== undefined) {
      if (
        reason !== null &&
        (typeof reason !== 'string' || reason.length > MAX_REASON_LENGTH)
      ) {
        return res.status(400).json({
          error: true,
          message: `reason must be a string of at most ${MAX_REASON_LENGTH} characters`,
        });
      }
      $set.reason = reason;
    }

    // ---- Load existing + authorize ----------------------------------------
    const existing = await VerifiedQuestion.findOne({ paperId, questionIndex: qIdx });
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Correction not found' });
    }
    const isOwner = String(existing.correctedBy) === String(userId);
    if (!isOwner && !isSuperAdmin(req)) {
      return res.status(403).json({
        error: true,
        message: 'Forbidden: not the author of this correction',
      });
    }

    // Snapshot old values for audit
    const oldValue = {
      correctedDomain: existing.correctedDomain,
      correctedLevel: existing.correctedLevel,
      correctedLevelName: existing.correctedLevelName,
      reason: existing.reason,
    };

    // ---- Apply update ------------------------------------------------------
    const updated = await withTransaction(async (session) => {
      return VerifiedQuestion.findOneAndUpdate(
        { paperId, questionIndex: qIdx },
        { $set },
        { new: true, session }
      );
    });

    // ---- Audit (after commit) ---------------------------------------------
    await logAudit({
      userId,
      action: 'verified_question.correction_updated',
      resource: 'VerifiedQuestion',
      changes: {
        oldValue,
        newValue: {
          correctedDomain: updated.correctedDomain,
          correctedLevel: updated.correctedLevel,
          correctedLevelName: updated.correctedLevelName,
          reason: updated.reason,
        },
        fields: Object.keys($set).filter(k => k !== 'correctedAt'),
      },
      request: req,
    });

    return res.status(200).json({ error: false, updated });
  } catch (err) {
    console.error('[verifiedQuestion.updateCorrection]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /reviewer/papers/:paperId/corrections/:questionIndex
// ---------------------------------------------------------------------------
async function deleteCorrection(req, res) {
  try {
    const { paperId, questionIndex } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthenticated' });
    }

    if (!isObjectId(paperId)) {
      return res.status(400).json({ error: true, message: 'Invalid paperId' });
    }
    const qIdx = Number(questionIndex);
    if (!Number.isInteger(qIdx) || qIdx < 0) {
      return res.status(400).json({
        error: true,
        message: 'questionIndex must be a non-negative integer',
      });
    }

    const existing = await VerifiedQuestion.findOne({ paperId, questionIndex: qIdx });
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Correction not found' });
    }
    const isOwner = String(existing.correctedBy) === String(userId);
    if (!isOwner && !isSuperAdmin(req)) {
      return res.status(403).json({
        error: true,
        message: 'Forbidden: not the author of this correction',
      });
    }

    const oldValue = existing.toObject();

    await withTransaction(async (session) => {
      await VerifiedQuestion.deleteOne(
        { paperId, questionIndex: qIdx },
        { session }
      );
    });

    await logAudit({
      userId,
      action: 'verified_question.correction_deleted',
      resource: 'VerifiedQuestion',
      changes: {
        oldValue,
        newValue: null,
        fields: ['paperId', 'questionIndex'],
      },
      request: req,
    });

    return res.status(200).json({ error: false, message: 'Correction deleted' });
  } catch (err) {
    console.error('[verifiedQuestion.deleteCorrection]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

module.exports = {
  submitCorrection,
  getCorrectionsForPaper,
  getSingleCorrection,
  updateCorrection,
  deleteCorrection,
};