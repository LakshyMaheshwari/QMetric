/**
 * Learning Domain Verb Dictionary
 *
 * Sources:
 *   - Bloom's Taxonomy (1956) & Revised (Anderson & Krathwohl, 2001)
 *   - Krathwohl, Bloom & Masia (1964) — Affective Domain
 *   - Simpson (1972) — Psychomotor Domain
 *   - Dave (1970), Harrow (1972) — Alternative Psychomotor
 *   - Fink (2003/2013) — Significant Learning
 *
 * Coverage: ~500 unique verbs across 3 domains, 18 levels
 *
 * Domain + Level mapping:
 *   Cognitive:   C1–C6  →  domain: 'cognitive',   level: 1–6
 *   Affective:   A1–A5  →  domain: 'affective',   level: 1–5
 *   Psychomotor: P1–P7  →  domain: 'psychomotor', level: 1–7
 */

// ═══════════════════════════════════════════════════════════════════
// RAW VERB LISTS BY DOMAIN & LEVEL
// ═══════════════════════════════════════════════════════════════════
const VERBS_BY_LEVEL = {
  // ─────────────────────────────────────────────────────────────
  // COGNITIVE — Bloom's
  // ─────────────────────────────────────────────────────────────
  cognitive: {
    1: [ // C1 Remember
      'acquire', 'add', 'ask', 'blend', 'browse', 'choose', 'cite', 'collect',
      'copy', 'define', 'describe', 'duplicate', 'enumerate', 'find', 'follow',
      'group', 'highlight', 'identify', 'indicate', 'label', 'list', 'listen',
      'locate', 'match', 'memorize', 'merge', 'mimic', 'name', 'number',
      'observe', 'omit', 'outline', 'quote', 'read', 'recall', 'recite',
      'recognize', 'recollect', 'record', 'repeat', 'reproduce', 'retell',
      'retrieve', 'review', 'search', 'select', 'sequence', 'sort', 'specify',
      'state', 'tabulate', 'tell', 'trace', 'underline', 'write',
    ],
    2: [ // C2 Understand
      'abstract', 'accept', 'adhere', 'annotate', 'approximate', 'associate',
      'characterize', 'clarify', 'classify', 'compare', 'comprehend',
      'convert', 'defend', 'detail', 'diagram', 'discriminate', 'discuss',
      'elaborate', 'estimate', 'exemplify', 'explain', 'express', 'extend',
      'extrapolate', 'generalize', 'grasp', 'illustrate', 'infer', 'interact',
      'interpret', 'interpolate', 'map', 'mix', 'note', 'organize',
      'paraphrase', 'predict', 'represent', 'restate', 'rewrite', 'show',
      'suggest', 'summarize', 'translate', 'visualize',
    ],
    3: [ // C3 Apply
      'act', 'adapt', 'administer', 'allocate', 'alphabetize', 'apply',
      'articulate', 'ascertain', 'assign', 'attain', 'avoid', 'calculate',
      'capture', 'change', 'chart', 'complete', 'compute', 'conduct',
      'construct', 'customize', 'deliver', 'demonstrate', 'derive', 'design',
      'determine', 'discover', 'display', 'document', 'dramatize', 'draw',
      'employ', 'ensure', 'examine', 'execute', 'exercise', 'experiment',
      'expose', 'figure', 'filter', 'graph', 'guide', 'handle', 'hypothesize',
      'implement', 'initiate', 'instruct', 'interview', 'invite', 'judge',
      'justify', 'manipulate', 'measure', 'model', 'modify', 'obtain',
      'operate', 'paint', 'participate', 'perform', 'personalize',
      'persevere', 'place', 'plot', 'practice', 'prepare', 'present', 'price',
      'process', 'produce', 'program', 'project', 'promote', 'propose',
      'protect', 'provide', 'realize', 'relate', 'schedule', 'simulate',
      'sketch', 'solve', 'subscribe', 'support', 'transcribe', 'transfer',
      'transform', 'use', 'utilize',
    ],
    4: [ // C4 Analyze
      'advertise', 'analyze', 'analyse', 'appraise', 'associate', 'audit',
      'attribute', 'blueprint', 'categorize', 'comment', 'conclude',
      'configure', 'connect', 'contrast', 'correlate', 'deconstruct', 'deduce',
      'detail', 'diagnose', 'differentiate', 'dismantle', 'dissect',
      'distinguish', 'divide', 'empathize', 'explore', 'extract', 'focus',
      'formulate', 'frame', 'infer', 'inspect', 'integrate', 'interrogate',
      'inventory', 'investigate', 'link', 'parse', 'prioritize', 'question',
      'research', 'scrutinize', 'separate', 'structure', 'subdivide', 'survey',
      'test',
    ],
    5: [ // C5 Evaluate
      'adjudicate', 'agree', 'amend', 'approve', 'argue', 'assess', 'award',
      'balance', 'check', 'clarify', 'collaborate', 'combine', 'consider',
      'convince', 'counsel', 'criticize', 'critique', 'debate', 'decide',
      'deduct', 'defend', 'detect', 'determine', 'disprove', 'estimate',
      'evaluate', 'exemplify', 'experiment', 'grade', 'hire', 'internalize',
      'interpret', 'judge', 'justify', 'mark', 'moderate', 'monitor',
      'perceive', 'persuade', 'predict', 'prove', 'qualify', 'rank', 'rate',
      'recommend', 'reconcile', 'reflect', 'reframe', 'release', 'resolve',
      'respond', 'revise', 'score', 'setup', 'test', 'validate', 'value',
      'verify',
    ],
    6: [ // C6 Create
      'advocate', 'align', 'animate', 'arrange', 'assemble', 'budget', 'build',
      'campaign', 'code', 'compile', 'compose', 'coordinate', 'cope', 'create',
      'cultivate', 'debug', 'delete', 'depict', 'develop', 'devise', 'dictate',
      'direct', 'elaborate', 'enhance', 'facilitate', 'form', 'generate',
      'imagine', 'improve', 'incorporate', 'increase', 'interfere', 'invent',
      'join', 'lecture', 'make', 'manage', 'maximize', 'minimize', 'negotiate',
      'network', 'optimize', 'order', 'originate', 'overhaul', 'plan', 'pledge',
      'portray', 'prescribe', 'publish', 'rearrange', 'reconstruct', 'redesign',
      'reorganize', 'restructure', 'rewrite', 'simulate', 'suppose',
      'synthesize', 'systematize', 'theorize',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // AFFECTIVE — Krathwohl
  // ─────────────────────────────────────────────────────────────
  affective: {
    1: [ // A1 Receiving
      'accept', 'acknowledge', 'attend', 'hold', 'receive', 'reply', 'sit',
    ],
    2: [ // A2 Responding
      'aid', 'answer', 'assist', 'communicate', 'comply', 'conform',
      'continue', 'contribute', 'cooperate', 'greet', 'help', 'inquire',
      'offer', 'relay', 'try',
    ],
    3: [ // A3 Valuing
      'adopt', 'assume', 'care', 'commit', 'complement', 'encourage',
      'endorse', 'enforce', 'establish', 'expedite', 'foster', 'praise',
      'prefer', 'preserve', 'refute', 'respect', 'share', 'study', 'thank',
      'uphold',
    ],
    4: [ // A4 Organizing
      'anticipate', 'confer', 'consult', 'lead', 'oversee', 'simplify',
      'submit', 'vary', 'weigh',
    ],
    5: [ // A5 Characterizing
      'advance', 'believe', 'behave', 'challenge', 'disagree', 'dispute',
      'embody', 'empathize', 'excuse', 'forgive', 'influence', 'motivate',
      'object', 'persist', 'profess', 'promulgate', 'reject', 'serve',
      'strive', 'tolerate',
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // PSYCHOMOTOR — Simpson
  // ─────────────────────────────────────────────────────────────
  psychomotor: {
    1: [ // P1 Perception
      'detect', 'hear', 'isolate', 'sense', 'perceive',
    ],
    2: [ // P2 Set
      'begin', 'move', 'proceed', 'setup', 'volunteer',
    ],
    3: [ // P3 Guided Response
      'accomplish', 'attempt', 'imitate', 'reproduce',
    ],
    4: [ // P4 Mechanism
      'activate', 'bend', 'calibrate', 'clean', 'close', 'correct', 'drill',
      'fasten', 'fix', 'grind', 'grip', 'hammer', 'heat', 'hook', 'load',
      'loosen', 'mend', 'nail', 'press', 'pull', 'push', 'refine', 'remove',
      'repair', 'replace', 'replicate', 'rotate', 'sand', 'saw', 'sew',
      'sharpen', 'stir', 'tune', 'type', 'wrap',
    ],
    5: [ // P5 Complex Overt Response
      'master',
    ],
    6: [ // P6 Adaptation
      'troubleshoot', 'reconfigure', 'rearrange',
    ],
    7: [ // P7 Origination
      'automate',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
// LEVEL NAMES
// ═══════════════════════════════════════════════════════════════════
const LEVEL_NAMES = {
  cognitive:   ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
  affective:   ['Receiving', 'Responding', 'Valuing', 'Organizing', 'Characterizing'],
  psychomotor: ['Perception', 'Set', 'Guided Response', 'Mechanism',
                'Complex Overt Response', 'Adaptation', 'Origination'],
};

const LEVEL_PREFIXES = {
  cognitive:   'C',
  affective:   'A',
  psychomotor: 'P',
};

// ═══════════════════════════════════════════════════════════════════
// AUTO-GENERATE CORE_VERBS (first occurrence wins)
// Process order: cognitive (1→6), affective (1→5), psychomotor (1→7)
// ═══════════════════════════════════════════════════════════════════
const CORE_VERBS = {};
for (const domain of ['cognitive', 'affective', 'psychomotor']) {
  const levels = VERBS_BY_LEVEL[domain];
  for (const level of Object.keys(levels).sort((a, b) => a - b)) {
    for (const raw of levels[level]) {
      const key = raw.toLowerCase().replace(/[^a-z]/g, '');
      if (!key || key.length < 3) continue;
      if (!CORE_VERBS[key]) {
        CORE_VERBS[key] = {
          domain,
          level: Number.parseInt(level, 10),
          name: LEVEL_NAMES[domain][Number.parseInt(level, 10) - 1],
          strength: 0.85,
        };
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// HIGH-CONFIDENCE OVERRIDES (manually tuned for specificity)
// ═══════════════════════════════════════════════════════════════════
const OVERRIDES = {
  // Cognitive — very specific verbs
  define: 0.95, list: 0.95, state: 0.95, analyze: 0.95, analyse: 0.95,
  compare: 0.92, contrast: 0.92, differentiate: 0.92, critique: 0.92,
  judge: 0.90, assess: 0.90, calculate: 0.92, solve: 0.92,
  derive: 0.88, implement: 0.88, design: 0.88, create: 0.92, synthesize: 0.92,

  // Affective — clear
  advocate: 0.92, internalize: 0.90, appreciate: 0.88, respect: 0.88,
  value: 0.88, commit: 0.85,

  // Psychomotor — clear
  calibrate: 0.90, troubleshoot: 0.92, operate: 0.88, measure: 0.85,
  assemble: 0.85, dismantle: 0.88,
};
Object.entries(OVERRIDES).forEach(([v, s]) => {
  if (CORE_VERBS[v]) CORE_VERBS[v].strength = s;
});

// ═══════════════════════════════════════════════════════════════════
// AMBIGUOUS VERBS — resolved by context keywords
// ═══════════════════════════════════════════════════════════════════
const AMBIGUOUS_VERBS = {
  demonstrate: [
    { domain: 'psychomotor', level: 3, keywords: ['use', 'operate', 'apparatus', 'equipment', 'tool', 'instrument', 'oscilloscope', 'multimeter', 'procedure', 'experiment'] },
    { domain: 'cognitive',   level: 3, keywords: ['show', 'prove', 'concept', 'theory', 'working', 'process'] },
    { domain: 'affective',   level: 3, keywords: ['value', 'ethic', 'respect', 'commitment', 'care'] },
  ],
  justify: [
    { domain: 'affective', level: 3, keywords: ['ethical', 'value', 'belief', 'moral', 'responsibility', 'social'] },
    { domain: 'cognitive', level: 5, keywords: ['algorithm', 'approach', 'design', 'choice', 'method'] },
  ],
  evaluate: [
    { domain: 'affective', level: 3, keywords: ['ethic', 'value', 'responsibility', 'moral', 'social', 'environment'] },
    { domain: 'cognitive', level: 5, keywords: ['efficiency', 'performance', 'algorithm', 'system'] },
  ],
  design: [
    { domain: 'psychomotor', level: 7, keywords: ['robot', 'circuit', 'prototype', 'hardware', 'device'] },
    { domain: 'cognitive',   level: 6, keywords: ['algorithm', 'schema', 'system', 'database', 'framework'] },
  ],
  use: [
    { domain: 'psychomotor', level: 4, keywords: ['equipment', 'apparatus', 'tool', 'instrument', 'machine'] },
    { domain: 'cognitive',   level: 3, keywords: ['method', 'formula', 'algorithm', 'technique'] },
  ],
  operate: [
    { domain: 'psychomotor', level: 4, keywords: ['machine', 'equipment', 'device', 'apparatus'] },
    { domain: 'cognitive',   level: 3, keywords: ['system', 'process', 'algorithm', 'network'] },
  ],
  perform: [
    { domain: 'psychomotor', level: 3, keywords: ['procedure', 'experiment', 'operation', 'task'] },
    { domain: 'cognitive',   level: 3, keywords: ['calculation', 'analysis', 'algorithm'] },
    { domain: 'affective',   level: 2, keywords: ['duty', 'responsibility', 'service'] },
  ],
  measure: [
    { domain: 'psychomotor', level: 4, keywords: ['apparatus', 'instrument', 'equipment', 'device'] },
    { domain: 'cognitive',   level: 3, keywords: ['value', 'parameter', 'data'] },
  ],
  organize: [
    { domain: 'psychomotor', level: 4, keywords: ['equipment', 'apparatus', 'setup', 'materials'] },
    { domain: 'cognitive',   level: 2, keywords: ['information', 'data', 'concept'] },
    { domain: 'affective',   level: 4, keywords: ['priority', 'value', 'ethic'] },
  ],
  adapt: [
    { domain: 'psychomotor', level: 6, keywords: ['equipment', 'apparatus', 'machine', 'procedure'] },
    { domain: 'cognitive',   level: 3, keywords: ['method', 'algorithm', 'approach'] },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// NON-MEASURABLE VERBS (flag for reviewers — do not use in exams)
// ═══════════════════════════════════════════════════════════════════
const NON_MEASURABLE_VERBS = [
  'believe', 'comprehend', 'conceptualize', 'experience', 'feel', 'know',
  'memorize', 'realize', 'think', 'understand',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function getLevelLabel(domain, level) {
  const prefix = LEVEL_PREFIXES[domain];
  return prefix ? `${prefix}${level}` : null;
}

function getLevelName(domain, level) {
  return LEVEL_NAMES[domain]?.[level - 1] || null;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════
module.exports = {
  VERBS_BY_LEVEL,
  CORE_VERBS,
  AMBIGUOUS_VERBS,
  NON_MEASURABLE_VERBS,
  LEVEL_NAMES,
  LEVEL_PREFIXES,
  DOMAINS: ['cognitive', 'affective', 'psychomotor'],
  getLevelLabel,
  getLevelName,
};