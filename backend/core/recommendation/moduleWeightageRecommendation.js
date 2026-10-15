// moduleWeightageRecommendation.js

/**
 * Build per-module recommendations comparing the expected mark distribution
 * (from module hours) against the actual marks allocated in the paper.
 */
function generateModuleRecommendations(moduleWeights) {
    const recommendations = [];

    moduleWeights.forEach((module, index) => {
        const expected = Math.round(module.expected);
        const actual = Math.round(module.actual);

        let suggestion;
        if (expected !== actual) {
            suggestion = actual < expected
                ? 'Increase marks for this module'
                : 'Reduce marks for this module';
        } else {
            suggestion = 'Marks for this module are appropriate';
        }

        recommendations.push({
            module: `Module ${index + 1}`,
            expected,
            actual,
            suggestion,
        });
    });

    return recommendations;
}

module.exports = { generateModuleRecommendations };