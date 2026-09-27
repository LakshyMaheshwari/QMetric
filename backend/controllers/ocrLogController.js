'use strict';

const mongoose = require('mongoose');
const OCRLog = require('../Model/OCRLog');
const User = require('../Model/user');
const { logAudit } = require('../utils/auditLog');
const { getUserId, isSuperAdmin, getCollegeId } = require('../utils/currentUser');

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

function isObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

function parsePagination(q) {
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Number.parseInt(q.limit, 10) || DEFAULT_PAGE_LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

async function buildUserScope(req) {
  if (isSuperAdmin(req)) return null; // null means no filter — see all
  const collegeId = getCollegeId(req);
  if (!collegeId) throw Object.assign(new Error('Not assigned to a college'), { status: 403 });
  const ids = await User.find({ collegeId }).distinct('_id');
  return { userId: { $in: ids } };
}

// ---------------------------------------------------------------------------
// GET /admin/ocr-logs
// ---------------------------------------------------------------------------
async function listOcrLogs(req, res) {
  try {
    let scope;
    try { scope = await buildUserScope(req); } catch (e) {
      return res.status(e.status || 403).json({ error: true, message: e.message });
    }
    const { page, limit, skip } = parsePagination(req.query);

    const filter = scope ? { ...scope } : {};
    const VALID_STATUSES = ['verified', 'flagged', 'unverified'];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [ocrLogs, total] = await Promise.all([
      OCRLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email collegeName department')
        .lean(),
      OCRLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      error: false,
      ocrLogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[ocrLog.listOcrLogs]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /admin/ocr-logs/stats
// ---------------------------------------------------------------------------
async function getOcrStats(req, res) {
  try {
    let scope;
    try { scope = await buildUserScope(req); } catch (e) {
      return res.status(e.status || 403).json({ error: true, message: e.message });
    }
    const base = scope || {};

    const [verified, flagged, unverified] = await Promise.all([
      OCRLog.countDocuments({ ...base, status: 'verified' }),
      OCRLog.countDocuments({ ...base, status: 'flagged' }),
      OCRLog.countDocuments({ ...base, status: 'unverified' }),
    ]);
    const total = verified + flagged + unverified;

    return res.status(200).json({
      error: false,
      stats: {
        total,
        verified,
        flagged,
        unverified,
        verificationRate: total > 0 ? Number(((verified / total) * 100).toFixed(1)) : 0,
      },
    });
  } catch (err) {
    console.error('[ocrLog.getOcrStats]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /admin/ocr-logs/:logId
// ---------------------------------------------------------------------------
async function getOcrLog(req, res) {
  try {
    const { logId } = req.params;
    if (!isObjectId(logId)) {
      return res.status(400).json({ error: true, message: 'Invalid logId' });
    }

    const log = await OCRLog.findById(logId)
      .populate('userId', 'fullName email collegeName department collegeId')
      .lean();
    if (!log) {
      return res.status(404).json({ error: true, message: 'OCR log not found' });
    }

    if (!isSuperAdmin(req)) {
      const collegeId = getCollegeId(req);
      const user = log.userId;
      if (!user || String(user.collegeId) !== String(collegeId)) {
        return res.status(403).json({ error: true, message: 'Forbidden' });
      }
    }

    return res.status(200).json({ error: false, ocrLog: log });
  } catch (err) {
    console.error('[ocrLog.getOcrLog]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /admin/ocr-logs/:logId/verify
// ---------------------------------------------------------------------------
async function verifyOcrLog(req, res) {
  try {
    const { logId } = req.params;
    if (!isObjectId(logId)) {
      return res.status(400).json({ error: true, message: 'Invalid logId' });
    }

    const log = await OCRLog.findById(logId)
      .populate('userId', 'fullName email collegeName department collegeId')
      .lean();
    if (!log) {
      return res.status(404).json({ error: true, message: 'OCR log not found' });
    }

    if (!isSuperAdmin(req)) {
      const collegeId = getCollegeId(req);
      const user = log.userId;
      if (!user || String(user.collegeId) !== String(collegeId)) {
        return res.status(403).json({ error: true, message: 'Forbidden' });
      }
    }

    const { status = 'verified' } = req.body || {};
    if (!['verified', 'flagged', 'unverified'].includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'status must be one of: verified, flagged, unverified',
      });
    }

    const updated = await OCRLog.findByIdAndUpdate(logId, { $set: { status } }, { new: true }).lean();

    // Sync idVerification.status on the User doc
    const userId = log.userId._id || log.userId;
    await User.findByIdAndUpdate(userId, {
      'idVerification.status': status,
      'idVerification.updatedAt': new Date(),
    });

    await logAudit({
      userId: getUserId(req),
      action: 'ocr_log.manual_verify',
      resource: 'OCRLog',
      changes: {
        oldValue: { status: log.status },
        newValue: { status },
        fields: ['status'],
      },
      request: req,
    });

    return res.status(200).json({ error: false, ocrLog: updated, message: `Status set to ${status}` });
  } catch (err) {
    console.error('[ocrLog.verifyOcrLog]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /admin/ocr-logs/:logId/reject
// ---------------------------------------------------------------------------
async function rejectOcrLog(req, res) {
  try {
    const { logId } = req.params;
    if (!isObjectId(logId)) {
      return res.status(400).json({ error: true, message: 'Invalid logId' });
    }

    const { reason, status = 'flagged' } = req.body || {};
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        error: true,
        message: 'Reason is required',
      });
    }

    const log = await OCRLog.findById(logId)
      .populate('userId', 'fullName email collegeName department collegeId')
      .lean();
    if (!log) {
      return res.status(404).json({ error: true, message: 'OCR log not found' });
    }

    if (!isSuperAdmin(req)) {
      const collegeId = getCollegeId(req);
      const user = log.userId;
      if (!user || String(user.collegeId) !== String(collegeId)) {
        return res.status(403).json({ error: true, message: 'Forbidden' });
      }
    }

    const updated = await OCRLog.findByIdAndUpdate(
      logId,
      { $set: { status, reason: reason.trim() } },
      { new: true }
    ).lean();

    // Sync idVerification.status on the User doc
    const userId = log.userId._id || log.userId;
    await User.findByIdAndUpdate(userId, {
      'idVerification.status': status,
      'idVerification.updatedAt': new Date(),
    });

    await logAudit({
      userId: getUserId(req),
      action: 'ocr_log.manual_reject',
      resource: 'OCRLog',
      changes: {
        oldValue: { status: log.status },
        newValue: { status, reason: reason.trim() },
        fields: ['status', 'reason'],
      },
      request: req,
    });

    return res.status(200).json({
      error: false,
      ocrLog: updated,
      message: 'OCR log rejected',
    });
  } catch (err) {
    console.error('[ocrLog.rejectOcrLog]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

module.exports = { listOcrLogs, getOcrStats, getOcrLog, verifyOcrLog, rejectOcrLog };
