// //v2
// const { FindBloomLevelsInText } = require("../Regex/Regex");
// const { generateBloomRecommendations } = require("../recommendation/bloomRecommendation");
// const { generateCORecommendations } = require("../recommendation/coWeightageRecommendation");
// const { generateModuleRecommendations } = require("../recommendation/moduleWeightageRecommendation");

// // Normalize sequence data to ensure the sum of all weights is 100
// function Normalize(seqData) {
//     let sum = seqData.reduce((acc, item) => acc + (+item.M), 0);
//     if (sum === 100) return seqData;
//     if (!sum || isNaN(sum)) return seqData;

//     return seqData.map(item => {
//         item.M = !isNaN(mark) ? (mark / sum) * 100 : 0;
//         return item;
//     });
// }

// // Function to handle Module Hours Penalty
// function calculateModulePenalty(ModuleWeights) {
//     let C2 = 0;
//     let n = ModuleWeights.length;
//     ModuleWeights.forEach(item => {
//         const diff = (item.expected - item.actual) / item.expected;
//         if (diff >= 0) {
//             C2 += diff;
//         }
//     });
//     return C2/n;
// }

// // Function to handle CO Penalty
// function calculateCOPenalty(dataArray, CO_Map) {
//     let C3 = 0;    

//     dataArray.forEach(item => {
//         const coKey = item[0]; 
//         const coNumber = coKey.replace('CO', '');
//         const actualScore = CO_Map[coNumber] || 0; 
//         const expectedWeight = item[1].weight;  
//         const diff = (expectedWeight - actualScore) / expectedWeight || 0;

//         if (diff > 0) {
//             C3 += diff;
//         }
//     });

//     const COCount = Object.keys(CO_Map).length;  
//     return COCount > 0 ? C3 / COCount : 0;  
// }    


// function obtainD(QHBTL, COBTL, returnRemark = false) {
//     const D = QHBTL - COBTL;
//     let qScore = 0;
//     let remark = "";

//     if (D === 0 || D === -1) {
//         remark = "Matches Expected Blooms Level";
//         qScore = 1;
//     } else if (D < -1) {
//         remark = "Higher than Expected Blooms Level";
//         qScore = 2;
//     } else if(D === 1) {
//         remark = "Lower than Expected Blooms Level";
//         qScore = -1;
//     } else {
//         remark = "Lower than Expected Blooms Level";
//         qScore = -1;
//     }

//     return returnRemark ? { qScore, remark } : qScore;
// }


// // Main Evaluation function
// exports.Evaluate = (SequenceData, pre_data, Module_Hrs, bloomLevelMap) => {
//     let ModuleWeights = [];
//     let checkModule = true;

//     // Assuming bloomLevelMap is available

// const BT_Weights = {
//     1: { level: 1, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     2: { level: 2, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     3: { level: 3, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
//     4: { level: 4, name: "", weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
// };

// // Sort pre_data by weight (descending)
// const dataArray = Object.entries(pre_data).sort((a, b) => {
//     return b[1].weight - a[1].weight; // Sort by weight
// });

// // Fill BT_Weights based on the bloomLevelMap
// dataArray.forEach(([co, data]) => {
//     const bloomKey = data.blooms[0]?.toLowerCase();
//     const bloomLevel = bloomLevelMap[bloomKey];
//     if (bloomLevel) {
//         BT_Weights[bloomLevel].weights += data.weight;
//         BT_Weights[bloomLevel].name = data.blooms[0]; // Add Bloom's level name
//     }

//     // Get all Bloom level names mapped to level 4
//     const level4Names = Object.entries(bloomLevelMap)
//         .filter(([name, level]) => level === 4)
//         .map(([name]) => name);

//     // Use level4Names as the name for level 4 wherever needed
//     BT_Weights[4].name = level4Names.join(', ');

// });


//     // Handle module hours
//     if (Module_Hrs && typeof Module_Hrs === 'object' && !Array.isArray(Module_Hrs)) {
//         let totalHrs = Object.values(Module_Hrs).reduce((sum, hrs) => sum + (+hrs || 0), 0);

//         if (totalHrs > 0) {
//             Object.keys(Module_Hrs).forEach(module => {
//                 let moduleHours = +Module_Hrs[module];
//                 ModuleWeights.push({
//                     expected: (moduleHours / totalHrs) * 100,
//                     actual: 0
//                 });
//             });
//         } else {
//             checkModule = false;
//         }
//     } else {
//         checkModule = false;
//     }

//     SequenceData = Normalize(SequenceData);

//     let QT_Map = {}, CO_Map = {};
//     let QP = 0, QPMin = 0, QPMax = 0;
//     let questionRecommendations = [];

//     SequenceData.forEach(i => {
//         QT_Map[i["Question Type"]] = (QT_Map[i["Question Type"]] || 0) + 1;

//         const co = parseInt(i.CO.match(/\d+/)[0]);
//         const coKey = `CO${co}`;
//         const coBloom = (pre_data[coKey]?.blooms?.[0] || "").toLowerCase();
//         const COBTL = bloomLevelMap[coBloom] || 4;

//         const QHBTL = BT_Weights[i[paperFields.BLOOMS_TAXONOMY_LEVEL]].level;

//         const{qScore, remark} = obtainD(QHBTL,COBTL,true);
//         i["Remark"] = remark;
//         QP += qScore;
//         QPMax += obtainD(1,COBTL);
//         QPMin += obtainD(4,COBTL);


//         const extractedVerb = i[paperFields.BLOOMS_VERBS] || "";
//         // Get the highest verb (Bloom's level name) for this question
//         const highestVerb =i[paperFields.BLOOMS_HIGHEST_VERB] || "N/A";

//         // Create recommendation object for this question
//         questionRecommendations.push({
//             QuestionData: i["Question No"] || i["Question"],
//             marks: +i.Marks,
//             co: coKey,
//             qScore: qScore,
//             extractedVerb: extractedVerb,
//             highestVerb: highestVerb,
//             remark: remark
//         });

//         BT_Weights[i[paperFields.BLOOMS_TAXONOMY_LEVEL]].marks += (+i.Marks);
//         BT_Weights[i[paperFields.BLOOMS_TAXONOMY_LEVEL]].No_Of_Questions++;
//         CO_Map[co] = (CO_Map[co] || 0) + (+i.Marks);

//         if (checkModule && i.Module) {
//             const match = i.Module.match(/\d+\.\d+|\d+/);
//             if (match) {
//                 const moduleNumber = parseFloat(match[0]);
//                 const moduleIndex = moduleNumber - 1;
//                 if (ModuleWeights[moduleIndex]) {
//                     ModuleWeights[moduleIndex].actual += (+i.Marks);
//                 }
//             }
//         }
//     });

//     // console.log("QP: ",QP);
//     // console.log("QPMax: ",QPMax);
//     // console.log("QPMin: ",QPMin);

//     // Normalize QP score
//     const QP_Final = ((QP - QPMin) / ((QPMax - QPMin) || 1)) * 100;

//     console.log("QP_Final: ",QP_Final);

//     // Penalty Calculations
//     const C2 = checkModule ? calculateModulePenalty(ModuleWeights) : 0;
//     const C3 = calculateCOPenalty(dataArray, CO_Map);

//     const P_Final = checkModule ? (C2 + C3) / 2 : C3;
//     console.log("P_Final: ",P_Final);
//     const PF_Percentage = (P_Final / 2) * 100;

//     const FinalScore = parseFloat(((QP_Final + (100 - PF_Percentage)) / 2).toFixed(2));

//     console.log("Final Score: ", FinalScore);

//     console.log("BT_Weights: ", BT_Weights);

//       // Generate recommendations and log them
//     // const bloomRecommendations = generateBloomRecommendations(SequenceData, pre_data, bloomLevelMap, CO_Map);
//     // console.log("Bloom Recommendations:", bloomRecommendations); 

//     const coRecommendations = generateCORecommendations(pre_data, CO_Map);
//     console.log("CO Recommendations:", coRecommendations); 

//     const moduleRecommendations = generateModuleRecommendations(ModuleWeights);
//     console.log("Module Recommendations:", moduleRecommendations); 

//     console.log("Question Recommendations:", questionRecommendations);


//     return {
//         QuestionData: SequenceData,
//         ModuleData: ModuleWeights,
//         BloomsData: BT_Weights,
//         COData: CO_Map,
//         FinalScore,
//         // BloomRecommendations: bloomRecommendations,
//         CORecommendations: coRecommendations,
//         ModuleRecommendations: moduleRecommendations,
//         QuestionRecommendations: questionRecommendations
//     };
// };

//Version 2
//v2
//v2
const paperFields = require('../constants/paperFields');
const { classifyPaper, aggregateInsights } = require('../nlp/verbClassifier');
const LearnedVerb = require('../../Model/LearnedVerb');
const VerifiedQuestion = require('../../Model/VerifiedQuestion');
const { generateCORecommendations } = require('../recommendation/coWeightageRecommendation');
const { generateModuleRecommendations } = require('../recommendation/moduleWeightageRecommendation');
const { generateBloomRecommendations } = require('../recommendation/bloomRecommendation');

/**
 * Normalize sequence data so all weights sum to 100.
 * No-op if the sum is already 100 or if the input has no numeric weights.
 */
function Normalize(seqData) {
    const sum = seqData.reduce((acc, item) => acc + (+item.M), 0);
    if (sum === 100) return seqData;
    if (!sum || Number.isNaN(sum)) return seqData;

    return seqData.map((item) => {
        item.M = !Number.isNaN(item.M) ? (item.M / sum) * 100 : 0;
        return item;
    });
}

/**
 * Module Hours Penalty.
 */
function calculateModulePenalty(ModuleWeights) {
    let C2 = 0;
    const n = ModuleWeights.length;
    ModuleWeights.forEach((item) => {
        const diff = (item.expected - item.actual) / item.expected;
        if (diff >= 0) {
            C2 += diff;
        }
    });
    return C2 / n;
}

/**
 * CO Penalty.
 */
function calculateCOPenalty(dataArray, CO_Map) {
    let C3 = 0;

    dataArray.forEach((item) => {
        const coKey = item[0];
        const coNumber = coKey.replace('CO', '');
        const actualScore = CO_Map[coNumber] || 0;
        const expectedWeight = item[1].weight;
        const diff = (expectedWeight - actualScore) / expectedWeight || 0;

        if (diff > 0) {
            C3 += diff;
        }
    });

    const COCount = Object.keys(CO_Map).length;
    return COCount > 0 ? C3 / COCount : 0;
}

/**
 * Compute the Bloom's-level difference score for one question.
 * Returns `{ qScore, remark }` when `returnRemark` is true, otherwise just `qScore`.
 */
function obtainD(QHBTL, COBTL, returnRemark = false) {
    const D = QHBTL - COBTL;
    let qScore = 0;
    let remark = '';

    if (D === 0 || D === -1) {
        remark = 'Matches Expected Blooms Level';
        qScore = 1;
    } else if (D < -1) {
        remark = 'Higher than Expected Blooms Level';
        qScore = 2;
    } else if (D >= 1) {
        remark = 'Lower than Expected Blooms Level';
        qScore = -1;
    }

    return returnRemark ? { qScore, remark } : qScore;
}

/**
 * Main evaluation pipeline.
 *
 * @param {Array}  SequenceData   Parsed questions (each with "Bloom's Taxonomy Level", CO, Marks, …)
 * @param {Object} pre_data       CO definitions: { CO1: { blooms: [...], weight: N }, ... }
 * @param {Object} Module_Hrs     { Module1: hrs, Module2: hrs, ... } (optional)
 * @param {Object} bloomLevelMap  { "remember": 1, "understand": 2, ... }
 * @param {Object} [options]      { paperId } — when supplied, VerifiedQuestion corrections
 *                                for that paper are loaded and applied before scoring.
 */
exports.Evaluate = async (SequenceData, pre_data, Module_Hrs, bloomLevelMap, options = {}) => {
    const { paperId = null } = options || {};

    const ModuleWeights = [];
    let checkModule = true;

    const BT_Weights = {
        1: { level: 1, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
        2: { level: 2, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
        3: { level: 3, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
        4: { level: 4, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
        5: { level: 5, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
        6: { level: 6, name: '', weights: 0, marks: 0, BT_penalty: 0, No_Of_Questions: 0 },
    };

    // Reverse map: level number → list of Bloom names at that level
    const levelToNameMap = {};
    Object.entries(bloomLevelMap).forEach(([name, level]) => {
        if (!levelToNameMap[level]) {
            levelToNameMap[level] = [];
        }
        levelToNameMap[level].push(name);
    });

    // Set the human-readable names on BT_Weights
    Object.keys(BT_Weights).forEach((level) => {
        const levelNum = Number.parseInt(level, 10);
        if (levelToNameMap[levelNum]) {
            BT_Weights[levelNum].name = levelToNameMap[levelNum].join(', ');
        }
    });

    // Sort pre_data by weight (descending)
    const dataArray = Object.entries(pre_data).sort((a, b) => b[1].weight - a[1].weight);

    // Fill BT_Weights based on the bloomLevelMap
    dataArray.forEach(([co, data]) => {
        const bloomKey = data.blooms[0]?.toLowerCase();
        const bloomLevel = bloomLevelMap[bloomKey];
        if (bloomLevel && bloomLevel >= 1 && bloomLevel <= 6) {
            BT_Weights[bloomLevel].weights += data.weight;
        }
    });

    // Handle module hours
    if (Module_Hrs && typeof Module_Hrs === 'object' && !Array.isArray(Module_Hrs)) {
        const totalHrs = Object.values(Module_Hrs).reduce((sum, hrs) => sum + (+hrs || 0), 0);

        if (totalHrs > 0) {
            Object.keys(Module_Hrs).forEach((module) => {
                const moduleHours = +Module_Hrs[module];
                ModuleWeights.push({
                    expected: (moduleHours / totalHrs) * 100,
                    actual: 0,
                });
            });
        } else {
            checkModule = false;
        }
    } else {
        checkModule = false;
    }

    SequenceData = Normalize(SequenceData);

    // ─── Load VerifiedQuestion corrections for this paper ─────────────
    // Corrections are keyed by array position (questionIndex) — the same
    // 0-based index used by the forEach below.
    const correctionMap = {};
    if (paperId && mongoose.Types.ObjectId.isValid(String(paperId))) {
        try {
            const corrections = await VerifiedQuestion.find({ paperId }).lean();
            corrections.forEach((c) => {
                correctionMap[c.questionIndex] = {
                    correctedLevel: c.correctedLevel,
                    correctedDomain: c.correctedDomain,
                    originalLevel: c.originalLevel,
                    originalDomain: c.originalDomain,
                    reason: c.reason || null,
                };
            });
            if (corrections.length > 0) {
                console.log(
                    `[Evaluate] Applied ${corrections.length} correction(s) for paper ${paperId}`
                );
            }
        } catch (e) {
            console.warn('[Evaluate] Failed to load corrections:', e.message);
        }
    }

    const QT_Map = {};
    const CO_Map = {};
    let QP = 0;
    let QPMin = 0;
    let QPMax = 0;
    const questionRecommendations = [];
    const appliedCorrections = [];

    SequenceData.forEach((i, idx) => {
        QT_Map[i[paperFields.QUESTION_TYPE]] = (QT_Map[i[paperFields.QUESTION_TYPE]] || 0) + 1;

        const co = Number.parseInt(i.CO.match(/\d+/)[0], 10);
        const coKey = `CO${co}`;
        const coBloom = (pre_data[coKey]?.blooms?.[0] || '').toLowerCase();
        const COBTL = bloomLevelMap[coBloom] || 6;

        // Ensure QHBTL is a valid level (1–6)
        let QHBTL = Number.parseInt(i[paperFields.BLOOMS_TAXONOMY_LEVEL], 10);

        if (Number.isNaN(QHBTL) || QHBTL < 1 || QHBTL > 6) {
            console.warn(
                `Warning: Invalid Bloom level ${i[paperFields.BLOOMS_TAXONOMY_LEVEL]} for question ${i[paperFields.QUESTION_NO]}, defaulting to 6`
            );
            QHBTL = 6;
            i[paperFields.BLOOMS_TAXONOMY_LEVEL] = 6;
        }

        const autoClassifiedLevel = QHBTL;

        // ─── Apply reviewer correction if one exists for this index ───────
        // Schema allows correctedLevel up to 7, but BT_Weights only has keys 1..6.
        // Clamp defensively so we never index a missing bucket.
        const correction = correctionMap[idx];
        if (correction) {
            const clamped = Math.min(6, Math.max(1, correction.correctedLevel));
            QHBTL = clamped;
            i[paperFields.BLOOMS_TAXONOMY_LEVEL] = clamped;
            i.wasCorrected = true;
            i.correctionReason = correction.reason;

            appliedCorrections.push({
                questionIndex: idx,
                autoClassifiedLevel,
                correctedLevel: clamped,
                correctedDomain: correction.correctedDomain || null,
                levelChange: clamped - autoClassifiedLevel,
                reason: correction.reason,
            });
        } else {
            i.wasCorrected = false;
        }

        const { qScore, remark } = obtainD(QHBTL, COBTL, true);
        i['Remark'] = remark;
        QP += qScore;
        QPMax += obtainD(1, COBTL);
        QPMin += obtainD(6, COBTL);

        const extractedVerb = i[paperFields.BLOOMS_VERBS] || '';
        const highestVerb = i[paperFields.BLOOMS_HIGHEST_VERB] || 'N/A';
        const bloomLevelName = BT_Weights[QHBTL].name || 'Unknown';

        questionRecommendations.push({
            QuestionData: i[paperFields.QUESTION_NO] || i.Question,
            marks: +i.Marks,
            co: coKey,
            qScore: qScore,
            extractedVerb: extractedVerb,
            highestVerb: highestVerb,
            bloomLevel: QHBTL,
            bloomLevelName: bloomLevelName,
            remark: remark,
        });

        BT_Weights[QHBTL].marks += (+i.Marks);
        BT_Weights[QHBTL].No_Of_Questions++;
        CO_Map[co] = (CO_Map[co] || 0) + (+i.Marks);

        if (checkModule && i.Module) {
            // Single unambiguous pattern — avoids catastrophic backtracking (S8786)
            const match = i.Module.match(/\d+(?:\.\d+)?/);
            if (match) {
                const moduleNumber = Number.parseFloat(match[0]);
                const moduleIndex = moduleNumber - 1;
                if (ModuleWeights[moduleIndex]) {
                    ModuleWeights[moduleIndex].actual += (+i.Marks);
                }
            }
        }
    });

    // Normalize QP score
    const QP_Final = ((QP - QPMin) / ((QPMax - QPMin) || 1)) * 100;
    console.log('QP_Final: ', QP_Final);

    // Penalty calculations
    const C2 = checkModule ? calculateModulePenalty(ModuleWeights) : 0;
    const C3 = calculateCOPenalty(dataArray, CO_Map);

    const P_Final = checkModule ? (C2 + C3) / 2 : C3;
    console.log('P_Final: ', P_Final);
    const PF_Percentage = (P_Final / 2) * 100;

    const FinalScore = Number.parseFloat(((QP_Final + (100 - PF_Percentage)) / 2).toFixed(2));

    console.log('Final Score: ', FinalScore);
    console.log('BT_Weights: ', BT_Weights);

    const coRecommendations = generateCORecommendations(pre_data, CO_Map);
    console.log('CO Recommendations:', coRecommendations);

    const moduleRecommendations = generateModuleRecommendations(ModuleWeights);
    console.log('Module Recommendations:', moduleRecommendations);

    const bloomRecommendations = generateBloomRecommendations(
        SequenceData,
        pre_data,
        bloomLevelMap,
        CO_Map
    );
    console.log('Bloom Recommendations:', bloomRecommendations);

    console.log('Question Recommendations:', questionRecommendations);

    // ─── Learning Domain Insights ─────────────────────────────
    let learnedCache = {};
    try {
        const learned = await LearnedVerb.find().lean();
        learned.forEach((l) => {
            learnedCache[l.verb] = {
                domain: l.domain,
                level: l.level,
                confidence: l.confidence,
            };
        });
    } catch (e) {
        console.warn('LearnedVerb cache load failed:', e.message);
    }

    const questionTexts = SequenceData.map((q) => q.Question || q[paperFields.QUESTION_NO] || q.text || '');
    const domainClassifications = classifyPaper(questionTexts, learnedCache);
    const DomainInsights = aggregateInsights(domainClassifications);

    // ─── Corrections summary ──────────────────────────────────
    const correctionsSummary = {
        totalApplied: appliedCorrections.length,
        avgLevelChange: appliedCorrections.length
            ? Number(
                  (
                      appliedCorrections.reduce((s, c) => s + c.levelChange, 0) /
                      appliedCorrections.length
                  ).toFixed(2)
              )
            : 0,
        increasedCount: appliedCorrections.filter((c) => c.levelChange > 0).length,
        decreasedCount: appliedCorrections.filter((c) => c.levelChange < 0).length,
        unchangedCount: appliedCorrections.filter((c) => c.levelChange === 0).length,
    };

    return {
        QuestionData: SequenceData,
        ModuleData: ModuleWeights,
        BloomsData: BT_Weights,
        COData: CO_Map,
        FinalScore,
        CORecommendations: coRecommendations,
        ModuleRecommendations: moduleRecommendations,
        QuestionRecommendations: questionRecommendations,
        DomainInsights,
        BloomRecommendations: bloomRecommendations,
        appliedCorrections,
        correctionsSummary,
    };
};