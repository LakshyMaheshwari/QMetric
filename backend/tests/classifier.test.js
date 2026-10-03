const { classify, classifyPaper, aggregateInsights } = require('../core/nlp/verbClassifier');

describe('Learning Domain Classifier — 5-Layer Vote Model', () => {
  // ═══════════════════════════════════════════════════════════
  // Layer 1 — Verb Prior (Dictionary Lookup)
  // ═══════════════════════════════════════════════════════════
  describe('Layer 1: Verb Prior', () => {
    test('"Define Ohm\'s law" → cognitive L1', () => {
      const r = classify("Define Ohm's law.");
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(1);
      expect(r.levelName).toBe('Remember');
      expect(r.score).toBeGreaterThanOrEqual(0.80);
      expect(r.needsReview).toBe(false);
    });

    test('"List the types of networks" → cognitive L1', () => {
      const r = classify('List the types of networks.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(1);
    });

    test('"Design a normalized database schema" → cognitive L6', () => {
      const r = classify('Design a normalized database schema.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(6);
      expect(r.levelName).toBe('Create');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Layer 2 — Object Clause Analysis (The Game-Changer)
  // ═══════════════════════════════════════════════════════════
  describe('Layer 2: Object Clause Analysis', () => {
    test('"Explain what a variable is" → L1 (overrides verb)', () => {
      const r = classify('Explain what a variable is.');
      expect(r.level).toBe(1);
    });

    test('"Explain how a transformer works" → L2', () => {
      const r = classify('Explain how a transformer works.');
      expect(r.level).toBe(2);
    });

    test('"Explain why quicksort is O(n log n)" → L4 (object clause overrides verb)', () => {
      const r = classify('Explain why quicksort has O(n log n) complexity.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(4);
      expect(r.levelName).toBe('Analyze');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Ambiguous Verbs — Context Resolution
  // ═══════════════════════════════════════════════════════════
  describe('Ambiguous Verbs — Context Matters', () => {
    test('"Demonstrate the use of an oscilloscope" → psychomotor L3', () => {
      const r = classify('Demonstrate the correct use of an oscilloscope.');
      expect(r.domain).toBe('psychomotor');
      expect(r.level).toBe(3);
    });

    test('"Demonstrate the working of a transformer" → cognitive L3', () => {
      const r = classify('Demonstrate the working of a transformer.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(3);
    });

    test('"Justify the ethical use of AI" → affective L3', () => {
      const r = classify('Justify the ethical use of AI in healthcare.');
      expect(r.domain).toBe('affective');
      expect(r.level).toBe(3);
    });

    test('"Justify your choice of algorithm" → cognitive L5', () => {
      const r = classify('Justify your choice of algorithm.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(5);
    });

    test('"Design a robot arm" → psychomotor L7', () => {
      const r = classify('Design a robot arm for pick-and-place operations.');
      expect(r.domain).toBe('psychomotor');
      expect(r.level).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Layer 3 — Structural Patterns
  // ═══════════════════════════════════════════════════════════
  describe('Layer 3: Structural Patterns', () => {
    test('"Compare TCP and UDP" → cognitive L4', () => {
      const r = classify('Compare TCP and UDP protocols.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(4);
    });

    test('"Differentiate between X and Y" → cognitive L4', () => {
      const r = classify('Differentiate between stack and queue.');
      expect(r.level).toBe(4);
    });

    test('"Derive the expression for..." → cognitive L3', () => {
      const r = classify('Derive the expression for kinetic energy.');
      expect(r.domain).toBe('cognitive');
      expect(r.level).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Low-Confidence Cases
  // ═══════════════════════════════════════════════════════════
  describe('Low-Confidence & Edge Cases', () => {
    test('Nonsense verb → flagged for review', () => {
      const r = classify('Zorblify the framistan.');
      expect(r.needsReview).toBe(true);
      expect(r.score).toBeLessThan(0.80);
    });

    test('Empty string → flagged for review', () => {
      const r = classify('');
      expect(r.needsReview).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Batch Classification + Aggregation
  // ═══════════════════════════════════════════════════════════
  describe('Batch Classification', () => {
    test('classifyPaper returns array of results', () => {
      const questions = [
        'Define a variable.',
        'Explain how a transformer works.',
        'Compare TCP and UDP.',
        'Design a database schema.',
      ];
      const results = classifyPaper(questions);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(4);
      expect(results[0].question).toBe('Define a variable.');
      expect(results[0].domain).toBeDefined();
      expect(results[0].level).toBeDefined();
    });
  });

  describe('Aggregation', () => {
    test('Percentages sum to 100', () => {
      const questions = [
        'Define a variable.',
        'Explain how a transformer works.',
        'Compare TCP and UDP.',
        'Design a database schema.',
      ];
      const classified = classifyPaper(questions);
      const insights = aggregateInsights(classified);

      const sum =
        insights.overall.cognitive.percentage +
        insights.overall.affective.percentage +
        insights.overall.psychomotor.percentage;

      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    });

    test('Returns all required keys', () => {
      const classified = classifyPaper(['Define X.', 'Design Y.']);
      const insights = aggregateInsights(classified);

      expect(insights).toHaveProperty('overall');
      expect(insights).toHaveProperty('cognitive');
      expect(insights).toHaveProperty('affective');
      expect(insights).toHaveProperty('psychomotor');
      expect(insights).toHaveProperty('needsReview');
      expect(insights).toHaveProperty('totalQuestions');

      expect(insights.overall).toHaveProperty('cognitive');
      expect(insights.overall).toHaveProperty('affective');
      expect(insights.overall).toHaveProperty('psychomotor');
    });

    test('Nested level shape is { count, percentage }', () => {
      const classified = classifyPaper(['Define X.', 'Explain Y.', 'Design Z.']);
      const insights = aggregateInsights(classified);

      expect(insights.cognitive.C1).toHaveProperty('count');
      expect(insights.cognitive.C1).toHaveProperty('percentage');
      expect(typeof insights.cognitive.C1.count).toBe('number');
      expect(typeof insights.cognitive.C1.percentage).toBe('number');
    });

    test('Empty paper returns safe defaults', () => {
      const insights = aggregateInsights([]);
      expect(insights.totalQuestions).toBe(0);
      expect(insights.overall.cognitive.count).toBe(0);
      expect(insights.overall.affective.count).toBe(0);
      expect(insights.overall.psychomotor.count).toBe(0);
    });

    test('detects multiple coordinated instructional verbs and flags review', () => {
  const r = classify(
    'Compare TCP and UDP and evaluate their security.'
  );

  expect(r.signals.detectedVerbs).toEqual(
    expect.arrayContaining([
      'compare',
      'evaluate',
    ])
  );

  expect(
    r.signals.multipleInstructionVerbs
  ).toBe(true);

  expect(r.needsReview).toBe(true);
});
  });
});