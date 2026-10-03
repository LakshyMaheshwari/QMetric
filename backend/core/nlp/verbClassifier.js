'use strict';

/**
 * 5-Layer Learning Domain Classifier
 *
 * Layers and weights:
 *   1. Verb dictionary lookup  — 40%
 *   2. Object clause analysis   — 25%
 *   3. Structural pattern       — 20%
 *   4. Historical (learned)    — 10%
 *   5. POS confirmation        — 5%
 *
 * Precedence:
 *   1. Historical always wins
 *   2. Strong ambiguous-verb context wins
 *   3. Strong structure >= 0.90
 *   4. Strong object clause >= 0.90
 *   5. Weighted vote fallback
 *
 * Accept if score >= 0.80.
 * Otherwise flag for review.
 */

const nlp = require('compromise');

const {
  CORE_VERBS,
  AMBIGUOUS_VERBS,
  getLevelName,
  getLevelLabel,
} = require('./verbDictionary');

const SCORE_THRESHOLD = 0.80;
const STRONG_SIGNAL_THRESHOLD = 0.90;

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

function normalizeVerb(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z'-]/g, '')
    .replace(/^['-]+|['-]+$/g, '');
}

function getDomainLevelMax(domain) {
  return DOMAIN_LEVEL_LIMITS[domain] || 0;
}

function isValidDomainLevel(domain, level) {
  const max = getDomainLevelMax(domain);

  return (
    typeof domain === 'string' &&
    max > 0 &&
    Number.isInteger(Number(level)) &&
    Number(level) >= 1 &&
    Number(level) <= max
  );
}

function isValidCandidate(candidate) {
  if (!candidate) return false;

  return isValidDomainLevel(
    candidate.domain,
    candidate.level
  );
}

/**
 * Extract all instructional verbs from the question.
 *
 * Compromise is used first.
 * A dictionary scan is then used as a fallback/augmentation
 * so coordinated verbs such as:
 *
 *   "Compare and evaluate two algorithms"
 *
 * are not lost when NLP misses one of them.
 */
function extractInstructionalVerbs(text) {
  const source = String(text || '').trim();

  if (!source) return [];

  const found = new Set();

  // -------------------------------------------------------------
  // 1. NLP extraction
  // -------------------------------------------------------------
  try {
    const detected = nlp(source)
      .verbs()
      .toInfinitive()
      .out('array');

    detected
      .map(normalizeVerb)
      .filter(
        (verb) =>
          verb.length >= 2 &&
          !NON_INSTRUCTIONAL_VERBS.has(verb)
      )
      .forEach((verb) => found.add(verb));
  } catch (err) {
    // Dictionary fallback below still runs.
  }

  // -------------------------------------------------------------
  // 2. Dictionary scan
  // -------------------------------------------------------------
  const words = source
    .toLowerCase()
    .replace(/[^a-z'-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const clean = normalizeVerb(word);

    if (!clean || NON_INSTRUCTIONAL_VERBS.has(clean)) {
      continue;
    }

    if (
      CORE_VERBS[clean] ||
      AMBIGUOUS_VERBS[clean]
    ) {
      found.add(clean);
    }
  }

  return Array.from(found);
}

/**
 * Return dictionary priority for a verb.
 *
 * Higher Bloom level gets higher priority when multiple
 * instructional verbs exist.
 */
function getVerbPriority(verb) {
  if (!verb) return 0;

  const core = CORE_VERBS[verb];

  if (core) {
    return Number(core.level) || 0;
  }

  const ambiguous = AMBIGUOUS_VERBS[verb];

  if (
    Array.isArray(ambiguous) &&
    ambiguous.length > 0
  ) {
    return Math.max(
      ...ambiguous.map(
        (item) => Number(item.level) || 0
      )
    );
  }

  return 0;
}

/**
 * LAYER 1 — Extract main verb
 *
 * When multiple instructional verbs exist,
 * select the highest Bloom-priority verb.
 */
function extractMainVerb(text) {
  const source = String(text || '').trim();

  if (!source) return null;

  // Imperative questions beginning with "demonstrate"
  // should use demonstrate as the instructional verb,
  // not the later verb "use".
  if (/^\s*demonstrate\b/i.test(source)) {
    return 'demonstrate';
  }

  const verbs =
    extractInstructionalVerbs(source);

  if (verbs.length === 0) {
    // Raw dictionary fallback.
    const words = source
      .toLowerCase()
      .split(/\s+/);

    for (const word of words) {
      const clean = normalizeVerb(word);

      if (
        CORE_VERBS[clean] ||
        AMBIGUOUS_VERBS[clean]
      ) {
        return clean;
      }
    }

    return null;
  }

  let best = null;

  for (const verb of verbs) {
    const priority =
      getVerbPriority(verb);

    if (
      !best ||
      priority > best.priority
    ) {
      best = {
        verb,
        priority,
      };
    }
  }

  return best?.verb || verbs[0];
}

/**
 * LAYER 1 — Dictionary candidate
 */
function getVerbCandidate(
  verb,
  text
) {
  if (!verb) return null;

  // -------------------------------------------------------------
  // Ambiguous verb — resolve from context.
  // -------------------------------------------------------------
  if (AMBIGUOUS_VERBS[verb]) {
    const lower =
      String(text || '').toLowerCase();

    for (
      const mapping
      of AMBIGUOUS_VERBS[verb]
    ) {
      const keywords =
        Array.isArray(mapping.keywords)
          ? mapping.keywords
          : [];

      if (
        keywords.some(
          (keyword) =>
            lower.includes(
              String(keyword).toLowerCase()
            )
        )
      ) {
        const candidate = {
          domain: mapping.domain,
          level: mapping.level,
          score: 1.0,
          source: 'verb',
          resolvedBy: 'context',
        };

        if (
          isValidCandidate(candidate)
        ) {
          return candidate;
        }
      }
    }

    // No context match — low confidence default.
    const first =
      AMBIGUOUS_VERBS[verb][0];

    if (first) {
      const candidate = {
        domain: first.domain,
        level: first.level,
        score: 0.55,
        source: 'verb',
        resolvedBy: 'default',
      };

      if (
        isValidCandidate(candidate)
      ) {
        return candidate;
      }
    }

    return null;
  }

  // -------------------------------------------------------------
  // Core dictionary
  // -------------------------------------------------------------
  const entry =
    CORE_VERBS[verb];

  if (entry) {
    const candidate = {
      domain: entry.domain,
      level: entry.level,
      score:
        typeof entry.strength === 'number'
          ? entry.strength
          : 0.95,
      source: 'verb',
    };

    if (
      isValidCandidate(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

/**
 * LAYER 2 — Object clause analysis
 */
const CLAUSE_PATTERNS = [
  {
    regex: /\b(what|define|definition)\b/i,
    domain: 'cognitive',
    level: 1,
    score: 0.92,
  },
  {
    regex:
      /\b(how|working of|process of|mechanism)\b/i,
    domain: 'cognitive',
    level: 2,
    score: 0.90,
  },
  {
    regex:
      /\b(use of|example of|implement|calculate|solve)\b/i,
    domain: 'cognitive',
    level: 3,
    score: 0.85,
  },
  {
    regex:
      /\b(why|compare|contrast|difference|trade-off)\b/i,
    domain: 'cognitive',
    level: 4,
    score: 0.92,
  },
  {
    regex:
      /\b(justify|evaluate|assess|critique|advantage)\b/i,
    domain: 'cognitive',
    level: 5,
    score: 0.90,
  },
  {
    regex:
      /\b(design|develop|create|propose|formulate)\b/i,
    domain: 'cognitive',
    level: 6,
    score: 0.88,
  },
  {
    regex:
      /\b(ethic|ethical|moral|responsibility|value)\b/i,
    domain: 'affective',
    level: 3,
    score: 0.92,
  },
  {
    regex:
      /\b(advocate|promote|uphold|commit to)\b/i,
    domain: 'affective',
    level: 5,
    score: 0.92,
  },
  {
    regex:
      /\b(apparatus|equipment|instrument|oscilloscope)\b/i,
    domain: 'psychomotor',
    level: 3,
    score: 0.90,
  },
  {
    regex:
      /\b(procedure|experiment|operation|protocol)\b/i,
    domain: 'psychomotor',
    level: 4,
    score: 0.85,
  },
  {
    regex:
      /\b(troubleshoot|adapt|adjust|modify)\b/i,
    domain: 'psychomotor',
    level: 6,
    score: 0.90,
  },
];

function getClauseCandidate(
  text,
  verb
) {
  if (!verb) return null;

  const source =
    String(text || '');

  const lower =
    source.toLowerCase();

  const idx =
    lower.indexOf(verb);

  if (idx === -1) {
    return null;
  }

  const clause =
    source
      .slice(idx + verb.length)
      .toLowerCase();

  for (
    const pattern
    of CLAUSE_PATTERNS
  ) {
    if (pattern.regex.test(clause)) {
      const candidate = {
        domain: pattern.domain,
        level: pattern.level,
        score: pattern.score,
        source: 'objectClause',
      };

      if (
        isValidCandidate(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * LAYER 3 — Structural pattern matching
 */
const STRUCTURE_PATTERNS = [
  {
    regex:
      /^compare\s+\S+(?:\s+\S+)*\s+and\s+/i,
    domain: 'cognitive',
    level: 4,
    score: 0.92,
  },
  {
    regex:
      /^contrast\s+\S+(?:\s+\S+)*\s+with\s+/i,
    domain: 'cognitive',
    level: 4,
    score: 0.92,
  },
  {
    regex:
      /^differentiate\s+between\s+/i,
    domain: 'cognitive',
    level: 4,
    score: 0.92,
  },
  {
    regex:
      /^design\s+\S+(?:\s+\S+)*\s+(for|using|with)/i,
    domain: 'cognitive',
    level: 6,
    score: 0.85,
  },
  {
    regex:
      /^evaluate\s+the\s+(efficiency|perf)/i,
    domain: 'cognitive',
    level: 5,
    score: 0.90,
  },
  {
    regex:
      /^justify\s+the\s+(ethical|moral)/i,
    domain: 'affective',
    level: 3,
    score: 0.92,
  },
  {
    regex:
      /^demonstrate\s+the\s+(use|operation)/i,
    domain: 'psychomotor',
    level: 3,
    score: 0.90,
  },
  {
    regex:
      /^derive\s+(the\s+)?(expression|equation)/i,
    domain: 'cognitive',
    level: 3,
    score: 0.88,
  },
  {
    regex:
      /^write\s+(short\s+)?notes\s+on\s+/i,
    domain: 'cognitive',
    level: 2,
    score: 0.85,
  },
  {
    regex:
      /^state\s+the\s+(advantages|disadvantages|disadv)/i,
    domain: 'cognitive',
    level: 4,
    score: 0.85,
  },
];

function getStructureCandidate(text) {
  const source =
    String(text || '').trim();

  if (!source) return null;

  for (
    const pattern
    of STRUCTURE_PATTERNS
  ) {
    if (pattern.regex.test(source)) {
      const candidate = {
        domain: pattern.domain,
        level: pattern.level,
        score: pattern.score,
        source: 'structure',
      };

      if (
        isValidCandidate(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * LAYER 4 — Historical / learned mapping
 */
function getHistoricalCandidate(
  verb,
  learnedCache
) {
  if (
    !verb ||
    !learnedCache ||
    typeof learnedCache !== 'object'
  ) {
    return null;
  }

  let learned =
    learnedCache[verb];

  if (Array.isArray(learned)) {
    learned =
      learned.find(
        isValidCandidate
      );
  }

  if (!learned) {
    return null;
  }

  const candidate = {
    domain: learned.domain,
    level: learned.level,
    score:
      typeof learned.confidence === 'number'
        ? learned.confidence
        : 0.95,
    source: 'historical',
  };

  if (
    !isValidCandidate(candidate)
  ) {
    return null;
  }

  return candidate;
}

/**
 * LAYER 5 — POS confirmation
 */
function getPOSScore(
  verb,
  text
) {
  if (!verb) return 0;

  const verbs =
    extractInstructionalVerbs(text);

  return verbs.includes(verb)
    ? 1.0
    : 0.5;
}

/**
 * Weighted vote fallback
 */
const LAYER_WEIGHTS = {
  verb: 0.40,
  objectClause: 0.25,
  structure: 0.20,
  historical: 0.10,
  pos: 0.05,
};

function weightedVote(
  candidates
) {
  const valid =
    candidates.filter(
      (candidate) =>
        candidate &&
        isValidCandidate(candidate) &&
        typeof candidate.score === 'number'
    );

  if (valid.length === 0) {
    return {
      domain: null,
      level: null,
      levelName: null,
      levelLabel: null,
      score: 0,
      needsReview: true,
      reason: 'No candidates',
      sources: [],
    };
  }

  const grouped = {};
  let totalWeight = 0;

  for (const candidate of valid) {
    const layerWeight =
      LAYER_WEIGHTS[
        candidate.source
      ] || 0.10;

    const signalScore =
      Math.max(
        0,
        Math.min(
          1,
          Number(candidate.score)
        )
      );

    const weight =
      layerWeight * signalScore;

    const key =
      `${candidate.domain}_${candidate.level}`;

    if (!grouped[key]) {
      grouped[key] = {
        domain: candidate.domain,
        level: candidate.level,
        weight: 0,
        maxScore: 0,
        sources: [],
      };
    }

    grouped[key].weight += weight;

    grouped[key].maxScore =
      Math.max(
        grouped[key].maxScore,
        signalScore
      );

    grouped[key].sources.push(
      candidate.source
    );

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return {
      domain: null,
      level: null,
      levelName: null,
      levelLabel: null,
      score: 0,
      needsReview: true,
      reason: 'Zero weighted confidence',
      sources: [],
    };
  }

  let winner = null;

  for (
    const group
    of Object.values(grouped)
  ) {
    if (
      !winner ||
      group.weight > winner.weight
    ) {
      winner = group;
    }
  }

  const consensus =
    winner.weight /
    totalWeight;

  const rawScore =
    consensus *
    winner.maxScore;

  const score =
    Math.round(rawScore * 100) / 100;

  return {
    domain: winner.domain,
    level: winner.level,
    levelName:
      getLevelName(
        winner.domain,
        winner.level
      ),
    levelLabel:
      getLevelLabel(
        winner.domain,
        winner.level
      ),
    score,
    needsReview:
      score < SCORE_THRESHOLD,
    sources: winner.sources,
  };
}

/**
 * Build result for precedence-based classification.
 */
function buildResult(
  candidate,
  source,
  verb,
  text,
  signals
) {
  if (
    !candidate ||
    !isValidCandidate(candidate)
  ) {
    return {
      domain: null,
      level: null,
      levelName: null,
      levelLabel: null,
      score: 0,
      needsReview: true,
      sources: [],
      resolvedBy: null,
      verb: verb || null,
      question: text,
      signals,
      reason:
        'Invalid classification candidate',
    };
  }

  const score =
    Math.max(
      0,
      Math.min(
        1,
        Number(candidate.score) || 0
      )
    );

  const multipleInstructionalVerbs =
    Array.isArray(
      signals?.detectedVerbs
    ) &&
    signals.detectedVerbs.length > 1;

  return {
    domain: candidate.domain,

    level: candidate.level,

    levelName:
      getLevelName(
        candidate.domain,
        candidate.level
      ),

    levelLabel:
      getLevelLabel(
        candidate.domain,
        candidate.level
      ),

    score,

    needsReview:
      score < SCORE_THRESHOLD ||
      multipleInstructionalVerbs,

    sources: [source],

    resolvedBy: source,

    verb: verb || null,

    question: text,

    signals,

    ...(multipleInstructionalVerbs
      ? {
          reason:
            'Multiple instructional verbs detected',
          detectedVerbs:
            signals.detectedVerbs,
        }
      : {}),
  };
}

/**
 * MAIN CLASSIFIER
 */
function classify(
  text,
  learnedCache = {}
) {
  const source =
    String(text || '').trim();

  const signals = {};
  const candidates = [];

  if (!source) {
    return {
      domain: null,
      level: null,
      levelName: null,
      levelLabel: null,
      score: 0,
      needsReview: true,
      sources: [],
      resolvedBy: null,
      verb: null,
      question: source,
      signals: {
        detectedVerbs: [],
        multipleInstructionVerbs: false,
        multipleInstructionalVerbs: false,
      },
      reason: 'Empty question',
    };
  }

  /**
   * -------------------------------------------------------------
   * Layer 1 — Verb
   * -------------------------------------------------------------
   */
  const detectedVerbs =
    extractInstructionalVerbs(
      source
    );

  const verb =
    extractMainVerb(source);

  signals.detectedVerbs =
    detectedVerbs;

  signals.multipleInstructionVerbs =
    detectedVerbs.length > 1;

  // Backward-compatible alias.
  signals.multipleInstructionalVerbs =
    signals.multipleInstructionVerbs;

  signals.verb =
    verb;

  const verbCandidate =
    getVerbCandidate(
      verb,
      source
    );

  if (verbCandidate) {
    candidates.push(
      verbCandidate
    );
  }

  /**
   * -------------------------------------------------------------
   * Layer 2 — Object clause
   * -------------------------------------------------------------
   */
  const clauseCandidate =
    getClauseCandidate(
      source,
      verb
    );

  if (clauseCandidate) {
    candidates.push(
      clauseCandidate
    );
  }

  /**
   * -------------------------------------------------------------
   * Layer 3 — Structure
   * -------------------------------------------------------------
   */
  const structureCandidate =
    getStructureCandidate(
      source
    );

  if (structureCandidate) {
    candidates.push(
      structureCandidate
    );
  }

  /**
   * -------------------------------------------------------------
   * Layer 4 — Historical
   * -------------------------------------------------------------
   */
  const historicalCandidate =
    getHistoricalCandidate(
      verb,
      learnedCache
    );

  if (historicalCandidate) {
    candidates.push(
      historicalCandidate
    );
  }

  /**
   * -------------------------------------------------------------
   * Layer 5 — POS
   * -------------------------------------------------------------
   */
  const posScore =
    getPOSScore(
      verb,
      source
    );

  signals.posScore =
    posScore;

  if (posScore > 0.5) {
    candidates.forEach(
      (candidate) => {
        if (!candidate) return;

        candidate.score =
          Math.min(
            1.0,
            candidate.score *
              (
                1 +
                (
                  posScore - 0.5
                ) *
                0.10
              )
          );
      }
    );
  }

  /**
   * -------------------------------------------------------------
   * PRECEDENCE 1 — Historical
   * -------------------------------------------------------------
   */
  if (historicalCandidate) {
    return buildResult(
      historicalCandidate,
      'historical',
      verb,
      source,
      signals
    );
  }

  /**
   * -------------------------------------------------------------
   * PRECEDENCE 2 — Strong ambiguous context
   * -------------------------------------------------------------
   */
  if (
    verbCandidate &&
    verbCandidate.resolvedBy ===
      'context' &&
    Number(verbCandidate.score) >= 1.0
  ) {
    return buildResult(
      verbCandidate,
      'verb',
      verb,
      source,
      signals
    );
  }

  /**
   * -------------------------------------------------------------
   * PRECEDENCE 3 — Strong structure
   * -------------------------------------------------------------
   */
  if (
    structureCandidate &&
    structureCandidate.score >=
      STRONG_SIGNAL_THRESHOLD
  ) {
    return buildResult(
      structureCandidate,
      'structure',
      verb,
      source,
      signals
    );
  }

  /**
   * -------------------------------------------------------------
   * PRECEDENCE 4 — Strong object clause
   * -------------------------------------------------------------
   */
  if (
    clauseCandidate &&
    clauseCandidate.score >=
      STRONG_SIGNAL_THRESHOLD
  ) {
    return buildResult(
      clauseCandidate,
      'objectClause',
      verb,
      source,
      signals
    );
  }

  /**
   * -------------------------------------------------------------
   * PRECEDENCE 5 — Weighted fallback
   * -------------------------------------------------------------
   */
  const result =
    weightedVote(candidates);

  result.verb =
    verb;

  result.question =
    source;

  result.signals =
    signals;

  result.detectedVerbs =
    detectedVerbs;

  if (
    detectedVerbs.length > 1
  ) {
    result.needsReview = true;

    result.reason =
      'Multiple instructional verbs detected';
  }

  return result;
}

/**
 * CLASSIFY PAPER
 */
function classifyPaper(
  questions,
  learnedCache = {}
) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map(
    (question, index) => {
      let text = '';

      if (
        typeof question === 'string'
      ) {
        text = question;
      } else if (
        question &&
        typeof question === 'object'
      ) {
        text =
          question.text ||
          question.Question ||
          question['Question No'] ||
          '';
      }

      const result =
        classify(
          text,
          learnedCache
        );

      return {
        index: index + 1,
        question: text,
        ...result,
      };
    }
  );
}

/**
 * AGGREGATE DOMAIN INSIGHTS
 */
function aggregateInsights(
  classifications
) {
  const items =
    Array.isArray(
      classifications
    )
      ? classifications
      : [];

  const stats = {
    cognitive: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      total: 0,
    },

    affective: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      total: 0,
    },

    psychomotor: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      total: 0,
    },
  };

  const needsReview = [];

  items.forEach(
    (classification, index) => {
      const domain =
        classification?.domain;

      const level =
        Number(
          classification?.level
        );

      if (
        !domain ||
        !isValidDomainLevel(
          domain,
          level
        )
      ) {
        needsReview.push({
          questionNumber:
            classification?.index ||
            index + 1,

          questionText:
            classification?.question ||
            '',

          verb:
            classification?.verb ||
            null,

          score:
            Number(
              classification?.score
            ) || 0,

          reason:
            classification?.reason ||
            'Not classified',
        });

        return;
      }

      stats[domain][level]++;
      stats[domain].total++;

      if (
        classification.needsReview
      ) {
        needsReview.push({
          questionNumber:
            classification.index ||
            index + 1,

          questionText:
            classification.question ||
            '',

          verb:
            classification.verb ||
            null,

          suggestedDomain:
            domain,

          suggestedLevel:
            level,

          suggestedLevelName:
            classification.levelName ||
            getLevelName(
              domain,
              level
            ),

          score:
            Number(
              classification.score
            ) || 0,

          reason:
            classification.reason ||
            (
              Array.isArray(
                classification.detectedVerbs
              ) &&
              classification.detectedVerbs.length > 1
                ? 'Multiple instructional verbs detected'
                : undefined
            ),
        });
      }
    }
  );

  const total =
    items.length || 1;

  const overall = {
    cognitive: {
      count:
        stats.cognitive.total,

      percentage:
        Math.round(
          (
            stats.cognitive.total /
            total
          ) * 100
        ),
    },

    affective: {
      count:
        stats.affective.total,

      percentage:
        Math.round(
          (
            stats.affective.total /
            total
          ) * 100
        ),
    },

    psychomotor: {
      count:
        stats.psychomotor.total,

      percentage:
        Math.round(
          (
            stats.psychomotor.total /
            total
          ) * 100
        ),
    },
  };

  const toLevelObject = (
    statsObject,
    prefix
  ) => {
    const output = {};

    Object.entries(
      statsObject
    ).forEach(
      ([key, value]) => {
        if (key === 'total') {
          return;
        }

        output[
          `${prefix}${key}`
        ] = {
          count: value,

          percentage:
            statsObject.total > 0
              ? Math.round(
                  (
                    value /
                    statsObject.total
                  ) * 100
                )
              : 0,
        };
      }
    );

    return output;
  };

  return {
    overall,

    cognitive:
      toLevelObject(
        stats.cognitive,
        'C'
      ),

    affective:
      toLevelObject(
        stats.affective,
        'A'
      ),

    psychomotor:
      toLevelObject(
        stats.psychomotor,
        'P'
      ),

    needsReview,

    totalQuestions:
      items.length,
  };
}

module.exports = {
  classify,
  classifyPaper,
  aggregateInsights,
  extractMainVerb,
  SCORE_THRESHOLD,
  STRONG_SIGNAL_THRESHOLD,
};