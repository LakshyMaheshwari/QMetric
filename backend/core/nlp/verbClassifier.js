/**
 * 5-Layer Learning Domain Classifier
 *
 * Layers and weights (used in fallback weighted vote):
 *   1. Verb dictionary lookup   — 40%
 *   2. Object clause analysis   — 25%
 *   3. Structural pattern       — 20%
 *   4. Historical (learned)     — 10%
 *   5. POS confirmation         — 5%
 *
 * Precedence rules (applied BEFORE weighted vote):
 *   - Historical always wins
 *   - Strong structure (score ≥ 0.90) overrides verb
 *   - Strong object clause (score ≥ 0.90) overrides verb
 *
 * Accept if score >= 0.80. Otherwise flag for review.
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

// ═══════════════════════════════════════════════════════════════════
// LAYER 1 — Extract main verb
// ═══════════════════════════════════════════════════════════════════
function extractMainVerb(text) {
  const doc = nlp(text);
  const verbs = doc.verbs().out('array')
    .map((v) => v.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean);

  if (verbs.length === 0) {
    // Fallback: scan for known verbs
    const words = text.toLowerCase().split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, '');
      if (CORE_VERBS[clean] || AMBIGUOUS_VERBS[clean]) return clean;
    }
    return null;
  }

  // Prefer verb with highest level (higher = more specific)
  let best = null;
  for (const v of verbs) {
    const entry = CORE_VERBS[v];
    const ambiguous = AMBIGUOUS_VERBS[v];
    let priority = 0;
    if (entry) priority = entry.level;
    else if (ambiguous) priority = Math.max(...ambiguous.map((a) => a.level));
    if (!best || priority > best.priority) {
      best = { verb: v, priority };
    }
  }
  return best?.verb || verbs[0];
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 1 — Get verb candidate (dictionary lookup)
// ═══════════════════════════════════════════════════════════════════
function getVerbCandidate(verb, text) {
  if (!verb) return null;

  // Ambiguous verbs → resolve via context keywords
  if (AMBIGUOUS_VERBS[verb]) {
    const lower = text.toLowerCase();
    for (const mapping of AMBIGUOUS_VERBS[verb]) {
      if (mapping.keywords.some((k) => lower.includes(k))) {
        return {
          domain: mapping.domain,
          level: mapping.level,
          score: 1.0,
          source: 'verb',
          resolvedBy: 'context',
        };
      }
    }
    // No keyword match → default to first option at low confidence
    const first = AMBIGUOUS_VERBS[verb][0];
    return {
      domain: first.domain,
      level: first.level,
      score: 0.55,
      source: 'verb',
      resolvedBy: 'default',
    };
  }

  // Core dictionary
  const entry = CORE_VERBS[verb];
  if (entry) {
    return {
      domain: entry.domain,
      level: entry.level,
      score: entry.strength,
      source: 'verb',
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2 — Object clause analysis
// ═══════════════════════════════════════════════════════════════════
const CLAUSE_PATTERNS = [
  { regex: /\b(what|define|definition)\b/,                          domain: 'cognitive',   level: 1, score: 0.92 },
  { regex: /\b(how|working of|process of|mechanism)\b/,             domain: 'cognitive',   level: 2, score: 0.90 },
  { regex: /\b(use of|example of|implement|calculate|solve)\b/,     domain: 'cognitive',   level: 3, score: 0.85 },
  { regex: /\b(why|compare|contrast|difference|trade-off)\b/,       domain: 'cognitive',   level: 4, score: 0.92 },
  { regex: /\b(justify|evaluate|assess|critique|advantage)\b/,      domain: 'cognitive',   level: 5, score: 0.90 },
  { regex: /\b(design|develop|create|propose|formulate)\b/,         domain: 'cognitive',   level: 6, score: 0.88 },
  { regex: /\b(ethic|ethical|moral|responsibility|value)\b/,        domain: 'affective',   level: 3, score: 0.92 },
  { regex: /\b(advocate|promote|uphold|commit to)\b/,               domain: 'affective',   level: 5, score: 0.92 },
  { regex: /\b(apparatus|equipment|instrument|oscilloscope)\b/,     domain: 'psychomotor', level: 3, score: 0.90 },
  { regex: /\b(procedure|experiment|operation|protocol)\b/,         domain: 'psychomotor', level: 4, score: 0.85 },
  { regex: /\b(troubleshoot|adapt|adjust|modify)\b/,                domain: 'psychomotor', level: 6, score: 0.90 },
];

function getClauseCandidate(text, verb) {
  if (!verb) return null;
  const idx = text.toLowerCase().indexOf(verb);
  if (idx === -1) return null;
  const clause = text.slice(idx + verb.length).toLowerCase();

  for (const p of CLAUSE_PATTERNS) {
    if (p.regex.test(clause)) {
      return { domain: p.domain, level: p.level, score: p.score, source: 'objectClause' };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 3 — Structural pattern matching
//
// Note on the middle matcher: `\S+(?:\s+\S+)*` replaces the naive `.+`
// so the pattern has no ambiguity between the "subject" matcher and the
// following `\s+`. This satisfies S8786 (non-linear backtracking) while
// producing identical matches for single-line inputs.
// ═══════════════════════════════════════════════════════════════════
const STRUCTURE_PATTERNS = [
  { regex: /^compare\s+\S+(?:\s+\S+)*\s+and\s+/i,          domain: 'cognitive',   level: 4, score: 0.92 },
  { regex: /^contrast\s+\S+(?:\s+\S+)*\s+with\s+/i,        domain: 'cognitive',   level: 4, score: 0.92 },
  { regex: /^differentiate\s+between\s+/i,                 domain: 'cognitive',   level: 4, score: 0.92 },
  { regex: /^design\s+\S+(?:\s+\S+)*\s+(for|using|with)/i, domain: 'cognitive',   level: 6, score: 0.85 },
  { regex: /^evaluate\s+the\s+(efficiency|perf)/i,         domain: 'cognitive',   level: 5, score: 0.90 },
  { regex: /^justify\s+the\s+(ethical|moral)/i,            domain: 'affective',   level: 3, score: 0.92 },
  { regex: /^demonstrate\s+the\s+(use|operation)/i,        domain: 'psychomotor', level: 3, score: 0.90 },
  { regex: /^derive\s+(the\s+)?(expression|equation)/i,    domain: 'cognitive',   level: 3, score: 0.88 },
  { regex: /^write\s+(short\s+)?notes\s+on\s+/i,           domain: 'cognitive',   level: 2, score: 0.85 },
  { regex: /^state\s+the\s+(advantages|disadv)/i,          domain: 'cognitive',   level: 4, score: 0.85 },
];

function getStructureCandidate(text) {
  for (const p of STRUCTURE_PATTERNS) {
    if (p.regex.test(text)) {
      return { domain: p.domain, level: p.level, score: p.score, source: 'structure' };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 4 — Historical (learned verbs from MongoDB)
// ═══════════════════════════════════════════════════════════════════
function getHistoricalCandidate(verb, learnedCache) {
  if (!verb || !learnedCache || !learnedCache[verb]) return null;
  const learned = learnedCache[verb];
  return {
    domain: learned.domain,
    level: learned.level,
    score: learned.confidence || 0.95,
    source: 'historical',
  };
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 5 — POS confirmation
// ═══════════════════════════════════════════════════════════════════
function getPOSScore(verb, text) {
  if (!verb) return 0;
  const doc = nlp(text);
  const verbs = doc.verbs().out('array')
    .map((v) => v.toLowerCase().replace(/[^a-z]/g, ''));
  return verbs.includes(verb) ? 1.0 : 0.5;
}

// ═══════════════════════════════════════════════════════════════════
// WEIGHTED VOTE (fallback when no precedence rule fires)
// ═══════════════════════════════════════════════════════════════════
const LAYER_WEIGHTS = {
  verb:         0.40,
  objectClause: 0.25,
  structure:    0.20,
  historical:   0.10,
  pos:          0.05,
};

function weightedVote(candidates) {
  const valid = candidates.filter(Boolean);
  if (valid.length === 0) {
    return {
      domain: null,
      level: null,
      levelName: null,
      levelLabel: null,
      score: 0,
      needsReview: true,
      reason: 'No candidates',
    };
  }

  const grouped = {};
  let totalWeight = 0;

  for (const c of valid) {
    const weight = (LAYER_WEIGHTS[c.source] || 0.10) * c.score;
    const key = `${c.domain}_${c.level}`;
    if (!grouped[key]) {
      grouped[key] = { domain: c.domain, level: c.level, weight: 0, sources: [] };
    }
    grouped[key].weight += weight;
    grouped[key].sources.push(c.source);
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return { domain: null, level: null, score: 0, needsReview: true };
  }

  let winner = null;
  for (const g of Object.values(grouped)) {
    if (!winner || g.weight > winner.weight) winner = g;
  }

  const score = Math.round((winner.weight / totalWeight) * 100) / 100;

  return {
    domain: winner.domain,
    level: winner.level,
    levelName: getLevelName(winner.domain, winner.level),
    levelLabel: getLevelLabel(winner.domain, winner.level),
    score,
    needsReview: score < SCORE_THRESHOLD,
    sources: winner.sources,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BUILD RESULT (helper for precedence returns)
// ═══════════════════════════════════════════════════════════════════
function buildResult(candidate, source, verb, text, signals) {
  return {
    domain: candidate.domain,
    level: candidate.level,
    levelName: getLevelName(candidate.domain, candidate.level),
    levelLabel: getLevelLabel(candidate.domain, candidate.level),
    score: candidate.score,
    needsReview: candidate.score < SCORE_THRESHOLD,
    sources: [source],
    resolvedBy: source,
    verb,
    question: text,
    signals,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CLASSIFY
// ═══════════════════════════════════════════════════════════════════
function classify(text, learnedCache = {}) {
  const signals = {};
  const candidates = [];

  // Layer 1: verb
  const verb = extractMainVerb(text);
  signals.verb = verb;
  const verbCand = getVerbCandidate(verb, text);
  if (verbCand) candidates.push(verbCand);

  // Layer 2: object clause
  const clauseCand = getClauseCandidate(text, verb);
  if (clauseCand) candidates.push(clauseCand);

  // Layer 3: structure
  const structCand = getStructureCandidate(text);
  if (structCand) candidates.push(structCand);

  // Layer 4: historical
  const histCand = getHistoricalCandidate(verb, learnedCache);
  if (histCand) candidates.push(histCand);

  // Layer 5: POS boost (multiplier on existing weights)
  const posScore = getPOSScore(verb, text);
  signals.posScore = posScore;
  if (posScore > 0.5) {
    candidates.forEach((c) => {
      if (c?.source !== 'pos') {
        c.score = Math.min(1.0, c.score * (1 + (posScore - 0.5) * 0.10));
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PRECEDENCE RULES
  // Order: historical → strong structure → strong object clause
  // ═══════════════════════════════════════════════════════════

  // 1. Historical (highest trust — human-corrected)
  if (histCand) {
    return buildResult(histCand, 'historical', verb, text, signals);
  }

  // 2. Ambiguous verb resolved by STRONG context
  // (e.g., "demonstrate" + "working" → cognitive L3, "justify" + "ethical" → affective L3)
  if (verbCand?.resolvedBy === 'context' && verbCand?.score === 1.0) {
    return buildResult(verbCand, 'verb', verb, text, signals);
  }

  // 3. Strong structural pattern (≥ 0.90)
  if (structCand && structCand.score >= STRONG_SIGNAL_THRESHOLD) {
    return buildResult(structCand, 'structure', verb, text, signals);
  }

  // 4. Strong object clause (≥ 0.90)
  if (clauseCand && clauseCand.score >= STRONG_SIGNAL_THRESHOLD) {
    return buildResult(clauseCand, 'objectClause', verb, text, signals);
  }

  // 5. Fallback — weighted vote
  const result = weightedVote(candidates);
  result.verb = verb;
  result.question = text;
  result.signals = signals;
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIFY PAPER
// ═══════════════════════════════════════════════════════════════════
function classifyPaper(questions, learnedCache = {}) {
  return questions.map((q, idx) => {
    const text = typeof q === 'string' ? q : (q.text || q.Question || q['Question No'] || '');
    const r = classify(text, learnedCache);
    return { index: idx + 1, question: text, ...r };
  });
}

// ═══════════════════════════════════════════════════════════════════
// AGGREGATE INSIGHTS
// ═══════════════════════════════════════════════════════════════════
function aggregateInsights(classifications) {
  const stats = {
    cognitive:   { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 },
    affective:   { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 },
    psychomotor: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, total: 0 },
  };
  const needsReview = [];

  classifications.forEach((c) => {
    if (!c.domain || !c.level) {
      needsReview.push({
        questionNumber: c.index,
        questionText: c.question,
        verb: c.verb || null,
        score: 0,
        reason: c.reason || 'Not classified',
      });
      return;
    }
    stats[c.domain][c.level]++;
    stats[c.domain].total++;

    if (c.needsReview) {
      needsReview.push({
        questionNumber: c.index,
        questionText: c.question,
        verb: c.verb,
        suggestedDomain: c.domain,
        suggestedLevel: c.level,
        suggestedLevelName: c.levelName,
        score: c.score,
      });
    }
  });

  const total = classifications.length || 1;

  const overall = {
    cognitive:   { count: stats.cognitive.total,   percentage: Math.round((stats.cognitive.total / total) * 100) },
    affective:   { count: stats.affective.total,   percentage: Math.round((stats.affective.total / total) * 100) },
    psychomotor: { count: stats.psychomotor.total, percentage: Math.round((stats.psychomotor.total / total) * 100) },
  };

  const toLevelObj = (s, prefix) => {
    const o = {};
    Object.entries(s).forEach(([k, v]) => {
      if (k === 'total') return;
      o[`${prefix}${k}`] = {
        count: v,
        percentage: s.total > 0 ? Math.round((v / s.total) * 100) : 0,
      };
    });
    return o;
  };

  return {
    overall,
    cognitive:   toLevelObj(stats.cognitive, 'C'),
    affective:   toLevelObj(stats.affective, 'A'),
    psychomotor: toLevelObj(stats.psychomotor, 'P'),
    needsReview,
    totalQuestions: classifications.length,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════
module.exports = {
  classify,
  classifyPaper,
  aggregateInsights,
  extractMainVerb,
  SCORE_THRESHOLD,
  STRONG_SIGNAL_THRESHOLD,
};