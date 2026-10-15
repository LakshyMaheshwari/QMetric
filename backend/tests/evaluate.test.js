'use strict';

const { Evaluate } = require('../core/evaluate/evaluate');
const paperFields = require('../core/constants/paperFields');

describe('Core Evaluation Engine (core/evaluate/evaluate.js)', () => {
  const bloomLevelMap = {
    remember: 1,
    understand: 2,
    apply: 3,
    analyze: 4,
    evaluate: 5,
    create: 6,
  };

  const coDetails = {
    CO1: { weight: 20, blooms: ['remember', 'understand'] },
    CO2: { weight: 30, blooms: ['apply'] },
    CO3: { weight: 50, blooms: ['analyze', 'evaluate'] },
  };

  const moduleHours = {
    M1: 10,
    M2: 15,
    M3: 25,
  };

  const sampleQuestions = [
    {
      [paperFields.QUESTION_NO]: '1',
      Question: 'Define Ohm’s law and state its limitations.',
      [paperFields.COURSE_OUTCOME]: '1',
      [paperFields.BLOOMS_TAXONOMY_LEVEL]: '1',
      Marks: '10',
      Module: '1',
    },
    {
      [paperFields.QUESTION_NO]: '2',
      Question: 'Calculate the total impedance of a series RLC circuit.',
      [paperFields.COURSE_OUTCOME]: '2',
      [paperFields.BLOOMS_TAXONOMY_LEVEL]: '3',
      Marks: '15',
      Module: '2',
    },
    {
      [paperFields.QUESTION_NO]: '3',
      Question: 'Analyze the frequency response of a low pass active filter and compare with passive filters.',
      [paperFields.COURSE_OUTCOME]: '3',
      [paperFields.BLOOMS_TAXONOMY_LEVEL]: '4',
      Marks: '25',
      Module: '3',
    },
  ];

  it('evaluates questions and produces valid FinalScore, recommendations, and domain insights', async () => {
    const result = await Evaluate(sampleQuestions, coDetails, moduleHours, bloomLevelMap);

    expect(result).toBeDefined();
    expect(typeof result.FinalScore).toBe('number');
    expect(result.FinalScore).toBeGreaterThanOrEqual(0);
    expect(result.FinalScore).toBeLessThanOrEqual(100);

    // Blooms distribution
    expect(result.BloomsData).toBeDefined();
    expect(result.BloomsData['1'].marks).toBe(10);
    expect(result.BloomsData['3'].marks).toBe(15);
    expect(result.BloomsData['4'].marks).toBe(25);

    // Recommendations
    expect(Array.isArray(result.QuestionRecommendations)).toBe(true);
    expect(result.QuestionRecommendations.length).toBe(3);
    expect(result.CORecommendations).toBeDefined();
    expect(result.ModuleRecommendations).toBeDefined();
    expect(result.BloomRecommendations).toBeDefined();

    // Domain insights
    expect(result.DomainInsights).toBeDefined();
    expect(result.DomainInsights.totalQuestions).toBe(3);
    expect(result.DomainInsights.overall.cognitive.count).toBeGreaterThan(0);
  });

  it('handles empty questions gracefully without crashing', async () => {
    const result = await Evaluate([], coDetails, moduleHours, bloomLevelMap);

    expect(result).toBeDefined();
    expect(typeof result.FinalScore).toBe('number');
    expect(result.QuestionRecommendations.length).toBe(0);
    expect(result.DomainInsights).toBeDefined();
  });
});
