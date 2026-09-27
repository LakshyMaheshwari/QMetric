'use strict';

const mongoose = require('mongoose');
const LearnedVerb = require('../Model/LearnedVerb');
const { logAudit } = require('../utils/auditLog');

const VALID_DOMAINS = ['cognitive', 'affective', 'psychomotor'];
const MIN_LEVEL = 1;
const MAX_LEVEL = 7;
const MAX_VERB_LENGTH = 50;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

const COGNITIVE_LEVEL_NAMES = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
  7: 'Create',
};

function isObjectId(v) {
  if (v === null || v === undefined || v === '') return false;
  return mongoose.Types.ObjectId.isValid(v);
}

function getUserId(user) {
  if (!user) return null;
  return user.userId || user.id || user._id || null;
}

function parsePagination(q) {
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Number.parseInt(q.limit, 10) || DEFAULT_PAGE_LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

function validateVerbInput(body) {
  const errors = [];
  const { verb, domain, level, confidence, context } = body || {};

  if (!verb || typeof verb !== 'string' || verb.trim().length < 1 || verb.trim().length > MAX_VERB_LENGTH) {
    errors.push(`verb must be a string of length 1-${MAX_VERB_LENGTH}`);
  }
  if (!VALID_DOMAINS.includes(domain)) {
    errors.push(`domain must be one of: ${VALID_DOMAINS.join(', ')}`);
  }
  const lvl = Number(level);
  if (!Number.isInteger(lvl) || lvl < MIN_LEVEL || lvl > MAX_LEVEL) {
    errors.push(`level must be an integer between ${MIN_LEVEL} and ${MAX_LEVEL}`);
  }
  const conf = Number(confidence);
  if (Number.isNaN(conf) || conf < 0 || conf > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }
  if (context !== undefined && context !== null && typeof context !== 'string') {
    errors.push('context must be a string');
  }

  return {
    errors,
    cleaned: {
      verb: verb?.trim().toLowerCase(),
      domain,
      level: lvl,
      levelName: COGNITIVE_LEVEL_NAMES[lvl] || '',
      confidence: conf,
      context: context || '',
    },
  };
}

// ---------------------------------------------------------------------------
// POST /super-admin/learned-verbs
// ---------------------------------------------------------------------------
async function createLearnedVerb(req, res) {
  try {
    const userId = getUserId(req.user);
    if (!userId) return res.status(401).json({ error: true, message: 'Unauthenticated' });

    const { errors, cleaned } = validateVerbInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: true, message: 'Validation failed', details: errors });
    }

    const collegeId = req.body.collegeId || req.user.collegeId || null;
    if (collegeId && !isObjectId(collegeId)) {
      return res.status(400).json({ error: true, message: 'Invalid collegeId' });
    }

    const existing = await LearnedVerb.findOne({ verb: cleaned.verb, collegeId });
    if (existing) {
      return res.status(409).json({ error: true, message: `Verb "${cleaned.verb}" already exists for this college` });
    }

    const doc = await LearnedVerb.create({
      verb: cleaned.verb,
      domain: cleaned.domain,
      level: cleaned.level,
      levelName: cleaned.levelName,
      confidence: cleaned.confidence,
      context: cleaned.context,
      taughtBy: userId,
      collegeId,
    });

    await logAudit({
      userId,
      action: 'LEARNED_VERB_CREATED',
      resource: `LearnedVerb:${doc._id}`,
      changes: { newValue: { verb: cleaned.verb, domain: cleaned.domain, level: cleaned.level } },
      request: req,
    });

    return res.status(201).json({ error: false, learnedVerb: doc });
  } catch (err) {
    console.error('[learnedVerb.createLearnedVerb]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /super-admin/learned-verbs
// ---------------------------------------------------------------------------
async function getLearnedVerbs(req, res) {
  try {
    const { search, domain, collegeId, sortBy = 'usageCount', order = 'desc' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = {};
    if (collegeId) {
      if (!isObjectId(collegeId)) return res.status(400).json({ error: true, message: 'Invalid collegeId' });
      query.collegeId = collegeId;
    }
    if (domain) {
      if (!VALID_DOMAINS.includes(domain)) return res.status(400).json({ error: true, message: 'Invalid domain' });
      query.domain = domain;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const safe = search.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.verb = new RegExp(safe, 'i');
    }

    const sortable = ['usageCount', 'confidence', 'createdAt', 'verb'];
    const sortField = sortable.includes(sortBy) ? sortBy : 'usageCount';
    const sortDir = order === 'asc' ? 1 : -1;

    const [verbs, total] = await Promise.all([
      LearnedVerb.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .populate('taughtBy', 'fullName email')
        .populate('collegeId', 'name code')
        .lean(),
      LearnedVerb.countDocuments(query),
    ]);

    return res.json({
      error: false,
      verbs,
      total,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[learnedVerb.getLearnedVerbs]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// PUT /super-admin/learned-verbs/:verbId
// ---------------------------------------------------------------------------
async function updateLearnedVerb(req, res) {
  try {
    const { verbId } = req.params;
    const userId = getUserId(req.user);
    if (!isObjectId(verbId)) return res.status(400).json({ error: true, message: 'Invalid verbId' });

    const doc = await LearnedVerb.findById(verbId);
    if (!doc) return res.status(404).json({ error: true, message: 'Learned verb not found' });

    const { domain, level, confidence, context } = req.body || {};
    const $set = {};

    if (domain !== undefined) {
      if (!VALID_DOMAINS.includes(domain)) return res.status(400).json({ error: true, message: 'Invalid domain' });
      $set.domain = domain;
    }
    if (level !== undefined) {
      const lvl = Number(level);
      if (!Number.isInteger(lvl) || lvl < MIN_LEVEL || lvl > MAX_LEVEL) {
        return res.status(400).json({ error: true, message: `level must be between ${MIN_LEVEL} and ${MAX_LEVEL}` });
      }
      $set.level = lvl;
      $set.levelName = COGNITIVE_LEVEL_NAMES[lvl] || '';
    }
    if (confidence !== undefined) {
      const conf = Number(confidence);
      if (Number.isNaN(conf) || conf < 0 || conf > 1) {
        return res.status(400).json({ error: true, message: 'confidence must be 0-1' });
      }
      $set.confidence = conf;
      $set.taughtBy = userId;
      $set.taughtAt = new Date();
    }
    if (context !== undefined) $set.context = context;

    if (Object.keys($set).length === 0) {
      return res.status(400).json({ error: true, message: 'No fields to update' });
    }

    const oldValue = { domain: doc.domain, level: doc.level, confidence: doc.confidence, context: doc.context };
    Object.assign(doc, $set);
    await doc.save();

    await logAudit({
      userId,
      action: 'LEARNED_VERB_UPDATED',
      resource: `LearnedVerb:${doc._id}`,
      changes: { oldValue, newValue: $set, fields: Object.keys($set) },
      request: req,
    });

    return res.json({ error: false, updated: doc });
  } catch (err) {
    console.error('[learnedVerb.updateLearnedVerb]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /super-admin/learned-verbs/:verbId
// ---------------------------------------------------------------------------
async function deleteLearnedVerb(req, res) {
  try {
    const { verbId } = req.params;
    const userId = getUserId(req.user);
    if (!isObjectId(verbId)) return res.status(400).json({ error: true, message: 'Invalid verbId' });

    const doc = await LearnedVerb.findById(verbId);
    if (!doc) return res.status(404).json({ error: true, message: 'Learned verb not found' });

    const isTaughtByMe = String(doc.taughtBy) === String(userId);
    const isSuperAdmin = req.user.role === 'super_admin';
    if (!isTaughtByMe && !isSuperAdmin) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }

    const oldValue = doc.toObject();
    await LearnedVerb.deleteOne({ _id: verbId });

    await logAudit({
      userId,
      action: 'LEARNED_VERB_DELETED',
      resource: `LearnedVerb:${verbId}`,
      changes: { oldValue, newValue: null, fields: ['verb'] },
      request: req,
    });

    return res.json({ error: false, message: 'Verb deleted' });
  } catch (err) {
    console.error('[learnedVerb.deleteLearnedVerb]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// GET /super-admin/learned-verbs/suggestions
//   Scans PaperInfo questions for verbs that appear frequently but aren't yet
//   in the LearnedVerb collection. Rough heuristic (verb = first word).
// ---------------------------------------------------------------------------
async function getSuggestedVerbs(req, res) {
  try {
    const { collegeId, minUsage = 5, limit = 20 } = req.query;
    const minU = Math.max(1, Number.parseInt(minUsage, 10) || 5);
    const cap = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

    const PaperInfo = require('../Model/PaperInfo');
    const paperQuery = {};
    if (collegeId && isObjectId(collegeId)) paperQuery.collegeId = collegeId;

    const papers = await PaperInfo.find(paperQuery)
      .select('"Collected Data"')
      .limit(500)
      .lean();

    const freq = new Map();
    for (const p of papers) {
      const collected = p['Collected Data'] || [];
      const first = collected[0];
      const questions = Array.isArray(first?.QuestionData)
        ? first.QuestionData
        : Array.isArray(collected)
        ? collected
        : [];
      for (const q of questions) {
        const text = q.Question || q.question || '';
        const firstWord = String(text).trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
        if (!firstWord || firstWord.length < 3) continue;
        freq.set(firstWord, (freq.get(firstWord) || 0) + 1);
      }
    }

    const existing = await LearnedVerb.find({
      verb: { $in: Array.from(freq.keys()) },
      ...(collegeId ? { collegeId } : {}),
    }).select('verb').lean();
    const existingSet = new Set(existing.map((e) => e.verb));

    const suggestions = Array.from(freq.entries())
      .filter(([verb, count]) => !existingSet.has(verb) && count >= minU)
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([verb, frequency]) => ({
        verb,
        frequency,
        estimatedLevel: null,
        confidenceScore: Math.min(1, frequency / 20),
      }));

    return res.json({ error: false, suggestions });
  } catch (err) {
    console.error('[learnedVerb.getSuggestedVerbs]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// POST /super-admin/learned-verbs/bulk-import
// ---------------------------------------------------------------------------
async function bulkImportVerbs(req, res) {
  try {
    const { verbs } = req.body || {};
    const userId = getUserId(req.user);
    if (!Array.isArray(verbs) || verbs.length === 0) {
      return res.status(400).json({ error: true, message: 'verbs must be a non-empty array' });
    }
    if (verbs.length > 1000) {
      return res.status(400).json({ error: true, message: 'Bulk limit is 1000 per request' });
    }

    const toInsert = [];
    const errors = [];

    for (let i = 0; i < verbs.length; i++) {
      const { errors: e, cleaned } = validateVerbInput(verbs[i]);
      if (e.length) {
        errors.push({ rowIndex: i, verb: verbs[i]?.verb, errors: e });
        continue;
      }
      toInsert.push({
        ...cleaned,
        collegeId: verbs[i].collegeId || req.user.collegeId || null,
        taughtBy: userId,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      try {
        const result = await LearnedVerb.insertMany(toInsert, { ordered: false, rawResult: true });
        inserted = result.insertedCount || toInsert.length;
      } catch (bulkErr) {
        inserted = bulkErr?.insertedDocs?.length || 0;
        if (!inserted && bulkErr?.result?.nInserted) inserted = bulkErr.result.nInserted;
      }
    }

    await logAudit({
      userId,
      action: 'LEARNED_VERB_BULK_IMPORT',
      resource: 'LearnedVerb:bulk',
      changes: { newValue: { inserted, requested: verbs.length } },
      request: req,
    });

    return res.json({
      error: false,
      inserted,
      skipped: toInsert.length - inserted,
      invalid: errors.length,
      errors,
    });
  } catch (err) {
    console.error('[learnedVerb.bulkImportVerbs]', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}

module.exports = {
  createLearnedVerb,
  getLearnedVerbs,
  updateLearnedVerb,
  deleteLearnedVerb,
  getSuggestedVerbs,
  bulkImportVerbs,
};