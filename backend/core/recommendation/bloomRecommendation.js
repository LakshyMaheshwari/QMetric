const paperFields = require('../constants/paperFields');

/**
 * Build Bloom's-taxonomy recommendations by comparing each question's actual
 * level against the level expected from its CO mapping, plus a per-level
 * overview of question counts and weightage.
 *
 * Suggestion direction (fixed):
 *   - actual < expected  →  "Increase …"  (question is below the CO target)
 *   - actual > expected  →  "Question exceeds …"  (reduced if unintended)
 *   - actual = expected  →  "appropriate"
 */
function generateBloomRecommendations(sequenceData, coDetails, bloomLevelMap, actualCOData) {
    const recommendations = [];
    const actualWeightage = {};
    const expectedWeightage = {};

    // Fallback for an unmapped Bloom verb — matches evaluate.js which uses 6
    // (highest level) so classification does not silently downgrade.
    const DEFAULT_BLOOM_LEVEL = 6;

    // Count number of questions per Bloom's level
    const levelQuestionCounts = {};
    sequenceData.forEach((question) => {
        const actualLevel = question[paperFields.BLOOMS_TAXONOMY_LEVEL];
        levelQuestionCounts[actualLevel] = (levelQuestionCounts[actualLevel] || 0) + 1;
    });

    const totalQuestions = sequenceData.length;

    // Calculate actual weightage as percentage of questions for each level
    for (let level = 1; level <= 6; level++) {
        const count = levelQuestionCounts[level] || 0;
        const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
        actualWeightage[level] = Number(percentage.toFixed(2));
    }

    // Calculate expected weightage per Bloom's level from CO mapping
    Object.entries(coDetails).forEach(([coKey, details]) => {
        if (details.blooms && details.blooms.length > 0) {
            const bloom = details.blooms[0].toLowerCase();
            const level = bloomLevelMap[bloom] || DEFAULT_BLOOM_LEVEL;

            // Normalize CO key for actualCOData lookup (e.g. "CO1" -> "1")
            const normalizedKey =
                actualCOData[coKey] === undefined
                    ? coKey.replace(/CO/i, '').trim()
                    : coKey;

            const coWeightage = actualCOData[normalizedKey]?.weightage || 0;
            expectedWeightage[level] = (expectedWeightage[level] || 0) + coWeightage;
        }
    });

    sequenceData.forEach((question, index) => {
        const coKey = question.CO;
        const actualLevel = question[paperFields.BLOOMS_TAXONOMY_LEVEL];
        const expectedBloom = coDetails[coKey]?.blooms[0]?.toLowerCase() || '';
        const expectedLevel = bloomLevelMap[expectedBloom] || DEFAULT_BLOOM_LEVEL;

        let suggestion;
        let gap = expectedLevel - actualLevel; // positive → need to increase
        let severity = null;
        let estimatedPoints = 0;

        if (actualLevel !== expectedLevel) {
            // Direction fix: actual < expected means the question is BELOW the target.
            if (actualLevel < expectedLevel) {
                suggestion = "Increase Bloom's level to match CO requirement";
            } else {
                suggestion = 'Question exceeds CO requirement (reduce if unintended)';
            }

            const absGap = Math.abs(gap);
            if (absGap >= 3) severity = 'critical';
            else if (absGap === 2) severity = 'warning';
            else severity = 'info';

            estimatedPoints = absGap * 2;
        } else {
            suggestion = "Bloom's level is appropriate";
            gap = 0;
            severity = null;
            estimatedPoints = 0;
        }

        recommendations.push({
            questionIndex: index + 1,
            co: coKey,
            expectedLevel,
            actualLevel,
            gap,
            severity,
            estimatedPoints,
            suggestion,
        });
    });

    // Prepare overview for Bloom levels 1 to 6
    const bloomLevelOverview = {};
    for (let level = 1; level <= 6; level++) {
        bloomLevelOverview[level] = {
            numberOfQuestions: levelQuestionCounts[level] || 0,
            actual: actualWeightage[level],
            expected: expectedWeightage[level] || 0,
        };
    }

    return {
        recommendations,
        bloomLevelOverview,
    };
}

module.exports = { generateBloomRecommendations };