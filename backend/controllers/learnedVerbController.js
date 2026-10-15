'use strict';

const nlp = require('compromise');

const {
  CORE_VERBS,
  AMBIGUOUS_VERBS,
  getLevelName,
} = require('../core/nlp/verbDictionary');

const mongoose = require('mongoose');
const logger = require('../config/logger');
const LearnedVerb = require('../Model/LearnedVerb');
const PaperInfo = require('../Model/PaperInfo');
const { logAudit } = require('../utils/auditLog');

const VALID_DOMAINS = ['cognitive', 'affective', 'psychomotor'];

const MIN_LEVEL = 1;
const MAX_LEVEL = 7;
const MAX_VERB_LENGTH = 50;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 50;

const DOMAIN_LEVEL_LIMITS = {
  cognitive: 6,
  affective: 5,
  psychomotor: 7,
};

const NON_INSTRUCTIONAL_VERBS = new Set([
  'be',
  'am',
  'is',
  'are',
  'was',
  'were',
  'been',
  'being',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'can',
  'could',
  'may',
  'might',
  'must',
  'shall',
  'should',
  'will',
  'would',
]);

function getDomainLevelMax(domain) {
  return DOMAIN_LEVEL_LIMITS[domain] || 0;
}

function isObjectId(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  return mongoose.Types.ObjectId.isValid(value);
}

function getUserId(user) {
  if (!user) {
    return null;
  }

  return user.userId || user.id || user._id || null;
}

function parsePagination(query) {
  const page = Math.max(
    1,
    Number.parseInt(query.page, 10) || 1
  );

  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(
      1,
      Number.parseInt(query.limit, 10) || DEFAULT_PAGE_LIMIT
    )
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function normalizeVerb(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .replace(/^['-]+|['-]+$/g, '');
}

function extractVerbsFromText(text) {
  const source = String(text || '').trim();

  if (!source) {
    return [];
  }

  try {
    const detected = nlp(source)
      .verbs()
      .toInfinitive()
      .out('array');

    return [
      ...new Set(
        detected
          .map(normalizeVerb)
          .filter(
            (verb) =>
              verb.length >= 2 &&
              !NON_INSTRUCTIONAL_VERBS.has(verb)
          )
      ),
    ];
  } catch (err) {
    logger.warn(
      { err },
      '[learnedVerb.extractVerbsFromText] NLP extraction failed'
    );

    return [];
  }
}

function validateVerbInput(body) {
  const errors = [];

  const {
    verb,
    domain,
    level,
    confidence,
    context,
  } = body || {};

  if (
    !verb ||
    typeof verb !== 'string' ||
    verb.trim().length < 1 ||
    verb.trim().length > MAX_VERB_LENGTH
  ) {
    errors.push(
      `verb must be a string of length 1-${MAX_VERB_LENGTH}`
    );
  }

  if (!VALID_DOMAINS.includes(domain)) {
    errors.push(
      `domain must be one of: ${VALID_DOMAINS.join(', ')}`
    );
  }

  const lvl = Number(level);
  const maxForDomain = getDomainLevelMax(domain);

  if (
    !Number.isInteger(lvl) ||
    !maxForDomain ||
    lvl < MIN_LEVEL ||
    lvl > Math.min(MAX_LEVEL, maxForDomain)
  ) {
    const rangeText = maxForDomain
      ? `${MIN_LEVEL}-${maxForDomain}`
      : `${MIN_LEVEL}-${MAX_LEVEL}`;

    errors.push(
      `level must be an integer between ${rangeText} for ${
        domain || 'the selected domain'
      }`
    );
  }

  const conf =
    confidence === undefined ||
    confidence === null ||
    confidence === ''
      ? 0.95
      : Number(confidence);

  if (Number.isNaN(conf) || conf < 0 || conf > 1) {
    errors.push(
      'confidence must be a number between 0 and 1'
    );
  }

  if (
    context !== undefined &&
    context !== null &&
    typeof context !== 'string'
  ) {
    errors.push('context must be a string');
  }

  const cleanedVerb = normalizeVerb(verb);

  if (verb && !cleanedVerb) {
    errors.push('verb must contain alphabetic characters');
  }

  return {
    errors,
    cleaned: {
      verb: cleanedVerb,
      domain,
      level: lvl,
      levelName:
        getLevelName(domain, lvl) || '',
      confidence: conf,
      context:
        typeof context === 'string'
          ? context.trim()
          : '',
    },
  };
}

function resolveCollegeId(req, requestedCollegeId) {
  const collegeId =
    requestedCollegeId !== undefined
      ? requestedCollegeId
      : req.user?.collegeId || null;

  if (collegeId && !isObjectId(collegeId)) {
    return {
      error: 'Invalid collegeId',
    };
  }

  return {
    collegeId: collegeId || null,
  };
}

// ---------------------------------------------------------------------------
// POST /super-admin/learned-verbs
// ---------------------------------------------------------------------------

async function createLearnedVerb(req, res) {
  try {
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Unauthenticated',
      });
    }

    const {
      errors,
      cleaned,
    } = validateVerbInput(req.body);

    if (errors.length) {
      return res.status(400).json({
        error: true,
        message: 'Validation failed',
        details: errors,
      });
    }

    const resolved = resolveCollegeId(
      req,
      req.body?.collegeId
    );

    if (resolved.error) {
      return res.status(400).json({
        error: true,
        message: resolved.error,
      });
    }

    const collegeId = resolved.collegeId;

    const existing = await LearnedVerb.findOne({
      verb: cleaned.verb,
      collegeId,
    });

    if (existing) {
      return res.status(409).json({
        error: true,
        message:
          `Verb "${cleaned.verb}" already exists for this college`,
      });
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
      changes: {
        newValue: {
          verb: cleaned.verb,
          domain: cleaned.domain,
          level: cleaned.level,
          collegeId,
        },
      },
      request: req,
    });

    return res.status(201).json({
      error: false,
      learnedVerb: doc,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: true,
        message:
          'This verb already exists for the selected college scope',
      });
    }

    logger.error(
      { err },
      '[learnedVerb.createLearnedVerb]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
}

// ---------------------------------------------------------------------------
// GET /super-admin/learned-verbs
// ---------------------------------------------------------------------------

async function getLearnedVerbs(req, res) {
  try {
    const {
      search,
      domain,
      collegeId,
      sortBy = 'usageCount',
      order = 'desc',
    } = req.query;

    const {
      page,
      limit,
      skip,
    } = parsePagination(req.query);

    const query = {};

    if (collegeId) {
      if (!isObjectId(collegeId)) {
        return res.status(400).json({
          error: true,
          message: 'Invalid collegeId',
        });
      }

      query.collegeId = collegeId;
    }

    if (domain) {
      if (!VALID_DOMAINS.includes(domain)) {
        return res.status(400).json({
          error: true,
          message: 'Invalid domain',
        });
      }

      query.domain = domain;
    }

    if (
      search &&
      typeof search === 'string' &&
      search.trim()
    ) {
      const safe = search
        .trim()
        .slice(0, 50)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.verb = new RegExp(safe, 'i');
    }

    const sortable = [
      'usageCount',
      'confidence',
      'createdAt',
      'verb',
    ];

    const sortField = sortable.includes(sortBy)
      ? sortBy
      : 'usageCount';

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
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error(
      { err },
      '[learnedVerb.getLearnedVerbs]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
}

// ---------------------------------------------------------------------------
// PUT /super-admin/learned-verbs/:verbId
// ---------------------------------------------------------------------------

async function updateLearnedVerb(req, res) {
  try {
    const { verbId } = req.params;
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Unauthenticated',
      });
    }

    if (!isObjectId(verbId)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid verbId',
      });
    }

    const doc = await LearnedVerb.findById(verbId);

    if (!doc) {
      return res.status(404).json({
        error: true,
        message: 'Learned verb not found',
      });
    }

    const {
      domain,
      level,
      confidence,
      context,
    } = req.body || {};

    const nextDomain =
      domain !== undefined
        ? domain
        : doc.domain;

    const nextLevel =
      level !== undefined
        ? Number(level)
        : doc.level;

    if (!VALID_DOMAINS.includes(nextDomain)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid domain',
      });
    }

    const maxForDomain =
      getDomainLevelMax(nextDomain);

    if (
      !Number.isInteger(nextLevel) ||
      nextLevel < MIN_LEVEL ||
      nextLevel > maxForDomain
    ) {
      return res.status(400).json({
        error: true,
        message:
          `level must be an integer between ` +
          `${MIN_LEVEL}-${maxForDomain} for ${nextDomain}`,
      });
    }

    const $set = {};

    if (domain !== undefined) {
      $set.domain = nextDomain;
    }

    if (
      level !== undefined ||
      domain !== undefined
    ) {
      $set.level = nextLevel;
      $set.levelName =
        getLevelName(
          nextDomain,
          nextLevel
        ) || '';
    }

    if (confidence !== undefined) {
      const conf = Number(confidence);

      if (
        Number.isNaN(conf) ||
        conf < 0 ||
        conf > 1
      ) {
        return res.status(400).json({
          error: true,
          message: 'confidence must be 0-1',
        });
      }

      $set.confidence = conf;
      $set.taughtBy = userId;
      $set.taughtAt = new Date();
    }

    if (context !== undefined) {
      if (context !== null && typeof context !== 'string') {
        return res.status(400).json({
          error: true,
          message: 'context must be a string',
        });
      }

      $set.context =
        typeof context === 'string'
          ? context.trim()
          : '';
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No fields to update',
      });
    }

    const oldValue = {
      domain: doc.domain,
      level: doc.level,
      levelName: doc.levelName,
      confidence: doc.confidence,
      context: doc.context,
    };

    Object.assign(doc, $set);

    await doc.save();

    await logAudit({
      userId,
      action: 'LEARNED_VERB_UPDATED',
      resource: `LearnedVerb:${doc._id}`,
      changes: {
        oldValue,
        newValue: $set,
        fields: Object.keys($set),
      },
      request: req,
    });

    return res.json({
      error: false,
      updated: doc,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: true,
        message:
          'This verb already exists for the selected college scope',
      });
    }

    logger.error(
      { err },
      '[learnedVerb.updateLearnedVerb]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
}

// ---------------------------------------------------------------------------
// DELETE /super-admin/learned-verbs/:verbId
// ---------------------------------------------------------------------------

async function deleteLearnedVerb(req, res) {
  try {
    const { verbId } = req.params;
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Unauthenticated',
      });
    }

    if (!isObjectId(verbId)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid verbId',
      });
    }

    const doc = await LearnedVerb.findById(verbId);

    if (!doc) {
      return res.status(404).json({
        error: true,
        message: 'Learned verb not found',
      });
    }

    const isTaughtByMe =
      String(doc.taughtBy) === String(userId);

    const isSuperAdmin =
      req.user.role === 'super_admin';

    if (!isTaughtByMe && !isSuperAdmin) {
      return res.status(403).json({
        error: true,
        message: 'Forbidden',
      });
    }

    const oldValue = doc.toObject();

    await LearnedVerb.deleteOne({
      _id: verbId,
    });

    await logAudit({
      userId,
      action: 'LEARNED_VERB_DELETED',
      resource: `LearnedVerb:${verbId}`,
      changes: {
        oldValue,
        newValue: null,
        fields: ['verb'],
      },
      request: req,
    });

    return res.json({
      error: false,
      message: 'Verb deleted',
    });
  } catch (err) {
    logger.error(
      { err },
      '[learnedVerb.deleteLearnedVerb]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
}

// ---------------------------------------------------------------------------
// GET /super-admin/learned-verbs/suggestions
//
// Scans PaperInfo questions, extracts verbs with NLP, excludes verbs already
// known by the static dictionary or LearnedVerb, and returns frequent unknown
// verbs as learning suggestions.
// ---------------------------------------------------------------------------

async function getSuggestedVerbs(req, res) {
  try {
    const {
      collegeId,
      minUsage = 5,
      limit = 20,
    } = req.query;

    const minU = Math.max(
      1,
      Number.parseInt(minUsage, 10) || 5
    );

    const cap = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(limit, 10) || 20
      )
    );

    let paperQuery = {};

    if (collegeId) {
      if (!isObjectId(collegeId)) {
        return res.status(400).json({
          error: true,
          message: 'Invalid collegeId',
        });
      }

      paperQuery = {
        collegeId,
      };
    }

    const papers = await PaperInfo.find(paperQuery)
      .select({
        'Collected Data': 1,
      })
      .limit(500)
      .lean();

    const freq = new Map();

    for (const paper of papers) {
      const collected =
        paper['Collected Data'] || [];

      const first = collected[0];

      const questions =
        Array.isArray(first?.QuestionData)
          ? first.QuestionData
          : Array.isArray(collected)
            ? collected
            : [];

      for (const question of questions) {
        const questionText =
          question?.Question ||
          question?.question ||
          question?.text ||
          '';

        const verbs =
          extractVerbsFromText(
            questionText
          );

        // Count a verb once per question.
        for (const verb of new Set(verbs)) {
          if (
            !CORE_VERBS[verb] &&
            !AMBIGUOUS_VERBS[verb]
          ) {
            freq.set(
              verb,
              (freq.get(verb) || 0) + 1
            );
          }
        }
      }
    }

    const candidateVerbs =
      Array.from(freq.keys());

    let existingQuery;

    if (collegeId) {
      existingQuery = {
        verb: {
          $in: candidateVerbs,
        },
        $or: [
          { collegeId: null },
          { collegeId },
        ],
      };
    } else {
      existingQuery = {
        verb: {
          $in: candidateVerbs,
        },
      };
    }

    const existing =
      candidateVerbs.length > 0
        ? await LearnedVerb.find(
            existingQuery
          )
            .select('verb')
            .lean()
        : [];

    const existingSet = new Set(
      existing.map(
        (entry) =>
          String(entry.verb)
            .toLowerCase()
            .trim()
      )
    );

    const suggestions =
      Array.from(freq.entries())
        .filter(
          ([verb, count]) =>
            !existingSet.has(verb) &&
            count >= minU
        )
        .sort(
          (a, b) => b[1] - a[1]
        )
        .slice(0, cap)
        .map(
          ([verb, frequency]) => ({
            verb,
            frequency,
            estimatedLevel: null,
            confidenceScore:
              Math.min(
                1,
                frequency / 20
              ),
          })
        );

    return res.json({
      error: false,
      suggestions,
    });
  } catch (err) {
    logger.error(
      { err },
      '[learnedVerb.getSuggestedVerbs]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
  }
}

// ---------------------------------------------------------------------------
// POST /super-admin/learned-verbs/bulk-import
// ---------------------------------------------------------------------------

async function bulkImportVerbs(req, res) {
  try {
    const { verbs } = req.body || {};
    const userId = getUserId(req.user);

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Unauthenticated',
      });
    }

    if (
      !Array.isArray(verbs) ||
      verbs.length === 0
    ) {
      return res.status(400).json({
        error: true,
        message:
          'verbs must be a non-empty array',
      });
    }

    if (verbs.length > 1000) {
      return res.status(400).json({
        error: true,
        message:
          'Bulk limit is 1000 per request',
      });
    }

    const toInsert = [];
    const errors = [];

    for (let i = 0; i < verbs.length; i += 1) {
      const row = verbs[i] || {};

      const {
        errors: validationErrors,
        cleaned,
      } = validateVerbInput(row);

      if (validationErrors.length) {
        errors.push({
          rowIndex: i,
          verb: row.verb,
          errors: validationErrors,
        });

        continue;
      }

      const resolved = resolveCollegeId(
        req,
        row.collegeId
      );

      if (resolved.error) {
        errors.push({
          rowIndex: i,
          verb: row.verb,
          errors: [resolved.error],
        });

        continue;
      }

      toInsert.push({
        ...cleaned,
        collegeId:
          resolved.collegeId,
        taughtBy: userId,
      });
    }

    // Prevent duplicate rows within the same request
    // before hitting the unique database index.
    const deduped = [];
    const seen = new Set();

    for (const item of toInsert) {
      const scope = item.collegeId
        ? String(item.collegeId)
        : 'global';

      const key =
        `${item.verb}::${scope}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      deduped.push(item);
    }

    let inserted = 0;

    if (deduped.length > 0) {
      try {
        const result =
          await LearnedVerb.insertMany(
            deduped,
            {
              ordered: false,
              rawResult: true,
            }
          );

        inserted =
          result.insertedCount ||
          result.insertedDocs?.length ||
          deduped.length;
      } catch (bulkErr) {
        inserted =
          bulkErr?.insertedDocs?.length ||
          bulkErr?.result?.nInserted ||
          0;

        logger.warn(
          {
            err: bulkErr,
            inserted,
          },
          '[learnedVerb.bulkImportVerbs] Partial import'
        );
      }
    }

    const skipped =
      deduped.length - inserted;

    await logAudit({
      userId,
      action: 'LEARNED_VERB_BULK_IMPORT',
      resource: 'LearnedVerb:bulk',
      changes: {
        newValue: {
          inserted,
          requested: verbs.length,
          invalid: errors.length,
          skipped,
        },
      },
      request: req,
    });

    return res.json({
      error: false,
      inserted,
      skipped,
      invalid: errors.length,
      errors,
    });
  } catch (err) {
    logger.error(
      { err },
      '[learnedVerb.bulkImportVerbs]'
    );

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
    });
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