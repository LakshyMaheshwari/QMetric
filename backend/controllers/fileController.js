// //version2
// const path = require("path");
// const fs = require("fs");
// const { Structurize } = require("../core/Regex/Regex");
// const PaperInfo = require("../Model/PaperInfo");
// const { Evaluate } = require("../core/evaluate/evaluate");

// exports.convertToText = async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send({ error: "No file uploaded." });
//     }

//     const userId = getUserId(req);

//     console.log("✅ Received POST /upload/totext");
//     console.log("req.body keys:", Object.keys(req.body));
//     console.log("req.body.FormData (raw):", req.body.FormData);
//     console.log("req.body.Sequence (raw):", req.body.Sequence);
//     console.log("req.file:", req.file);
//     console.log("userId:", userId);


//     const inputFileName = req.file.originalname;
//     const fileExtension = path.extname(inputFileName).toLowerCase();
//     const supportedExtensions = ['.xlsx'];

//     if (!supportedExtensions.includes(fileExtension)) {
//         return res.status(400).send({
//             error: "Invalid File Format",
//             message: "Only Excel files (.xlsx) are supported."
//         });
//     }

//     try {
//         const outputDir = path.join(__dirname, '../Converted');
//         if (!fs.existsSync(outputDir)) {
//             fs.mkdirSync(outputDir, { recursive: true });
//         }

//         const result = await saveToDB(userId, req.body.Sequence, req.body.FormData, req.file.path);
//         if (result.error) {
//             return res.status(500).send(result);
//         }

//         return res.send(result);

//     } catch (error) {
//         console.error('Error during conversion or DB save:', error);
//         return res.status(500).send({ error: "Server error while processing file" });
//     }
// };

// const saveToDB = async (userId, Sequence, FormData, filePath) => {
//     try {
//         // Step 1: Safely Parse Input JSON
//         let sequenceArray, formData;

//         try {
//             sequenceArray = JSON.parse(Sequence);
//             formData = JSON.parse(FormData);
//         } catch (parseErr) {
//             console.error("Error parsing JSON:", parseErr);
//             return { error: "Invalid JSON in Sequence or FormData" };
//         }

//         const coWeights = {};
//         const moduleHours = {};
//         const coDetails = {};

//         // Step 2: Process Sequence and FormData to Extract COs and Modules
//         sequenceArray.forEach(item => {
//             const match = item.name.match(/\d+/);  // Match the CO or Module number
//             if (!match) return;

//             const number = match[0];

//             if (item.type === 'CO') {
//                 const coKey = `CO${number}`;
//                 const weight = parseFloat(item.weight || 0);

//                 // Normalize Bloom levels to lowercase
//                 const blooms = Array.isArray(item.blooms)
//                     ? item.blooms.filter(b => typeof b === 'string').map(b => b.toLowerCase())
//                     : (typeof item.blooms === 'string' ? [item.blooms.toLowerCase()] : []);

//                 coWeights[coKey] = weight;
//                 coDetails[coKey] = { weight, blooms };
//             } else if (item.type === 'Module') {
//                 moduleHours[`M${number}`] = parseFloat(item.hours || 0);
//             }
//         });

//         // Step 3: Define all 6 Bloom levels in standard order
//         // const allBloomLevels = ['create', 'evaluate', 'analyze', 'apply', 'understand', 'remember'];
//         // const bloomLevelMap = {};

//         // // Step 4: Collect unique Bloom levels used in COs
//         // const usedBloomLevels = new Set();
//         // Object.values(coDetails).forEach(data => {
//         //     const bloom = (data.blooms[0] || "").toLowerCase();
//         //     if (bloom && allBloomLevels.includes(bloom)) {
//         //         usedBloomLevels.add(bloom);
//         //     }
//         // });

//         // // Step 5: Sort used Bloom levels by their standard order
//         // const sortedUsedBlooms = allBloomLevels.filter(level => usedBloomLevels.has(level));

//         // // Step 6: Assign levels dynamically (1, 2, 3, ... based on what's used)
//         // sortedUsedBlooms.forEach((bloom, index) => {
//         //     bloomLevelMap[bloom] = index + 1;
//         // });

//         // // Step 7: Assign remaining unused Bloom levels to next available level
//         // let nextLevel = sortedUsedBlooms.length + 1;
//         // allBloomLevels.forEach(level => {
//         //     if (!bloomLevelMap[level] && nextLevel <= 6) {
//         //         bloomLevelMap[level] = nextLevel;
//         //         nextLevel++;
//         //     }
//         // });

//         // // Step 8: Any remaining levels get assigned to level 6
//         // allBloomLevels.forEach(level => {
//         //     if (!bloomLevelMap[level]) {
//         //         bloomLevelMap[level] = 6;
//         //     }
//         // });

//         // Standard Bloom's Taxonomy mapping — fixed values, always correct
//         const bloomLevelMap = {
//             remember: 1,
//             understand: 2,
//             apply: 3,
//             analyze: 4,
//             evaluate: 5,
//             create: 6,
//         };

//         console.log("Bloom Level Map:", bloomLevelMap);

//         console.log("Used Bloom Levels:", Array.from(usedBloomLevels));
//         console.log("Dynamic Bloom Level Map:", bloomLevelMap);

//         // Step 6: Process Question Data
//         const questionData = await Structurize([], filePath, bloomLevelMap);
//         const evaluationResult = await Evaluate(questionData, coDetails, moduleHours, bloomLevelMap);

//         // Step 7: Save Data to MongoDB
//         const paper = new PaperInfo({
//             "College Name": formData[paperFields.COLLEGE_NAME],
//             "Branch": formData.Branch,
//             "Year Of Study": formData[paperFields.YEAR_OF_STUDY],
//             "Semester": formData.Semester,
//             "Course Name": formData[paperFields.COURSE_NAME],
//             "Course Code": formData[paperFields.COURSE_CODE],
//             "Course Teacher": formData[paperFields.COURSE_TEACHER],
//             Sequence: {
//                 COs: coDetails,
//                 ModuleHours: moduleHours
//             },
//             blommLevelMap: bloomLevelMap,
//             bloomLevelMap: bloomLevelMap,
//             "Collected Data": evaluationResult,
//             "userId": userId
//         });

//         // Step 8: Save the paper document to MongoDB
//         await paper.save();
//         return evaluationResult;

//     } catch (error) {
//         console.error("Error saving to MongoDB:", error);
//         return { error: "Failed to process and save data" };
//     }
// };

// exports.getResults = async (req, res) => {
//     try {
//         // Safely destructure userId from req.user, fallback to 'anonymous' if req.user is undefined
//         const { userId } = req.user || { userId: 'anonymous' };
//         // console.log(userId)

//         // Get all results for this user
//         const userResults = await PaperInfo.find({ userId })
//             .sort({ createdAt: -1 })
//             .lean();

//         if (userResults.length === 0) {
//             return res.status(404).json({
//                 error: 'No results found',
//                 message: 'No analysis results found for your account'
//             });
//         }

//         // Return the most recent result
//         const latestResult = userResults[0];
//         const { extractedText, ...responseData } = latestResult;

//         res.json({
//             success: true,
//             data: responseData
//         });

//     } catch (error) {
//         console.error('Get results error:', error);
//         res.status(500).json({
//             error: 'Internal server error',
//             message: 'Failed to retrieve results'
//         });
//     }
// };

// // exports.getResults = async(req, res) => {
// //   try{
// //     const id = req.params.id;
// //     console.log(id);
// //     const paper = await PaperInfo.findById(id);
// //     res.status(200).json(paper);
// //   } catch(error){
// //     res.status(500).json({message: error.message})
// //   }
// // };

// exports.getResultsById = async (req, res) => {
//     try {
//         // Safely destructure userId from req.user, fallback to 'anonymous' if req.user is undefined
//         const { userId } = req.user || { userId: 'anonymous' };


//         // Get all results for this user
//         const userResults = await PaperInfo.find({ userId })
//             .sort({ createdAt: -1 })
//             .lean();

//         if (userResults.length === 0) {
//             return res.status(404).json({
//                 error: 'No results found',
//                 message: 'No analysis results found for your account'
//             });
//         }

//         // Return the most recent result
//         const results = userResults.map(({ extractedText, ...rest }) => rest);

//         res.json({
//             success: true,
//             data: results
//         });

//     } catch (error) {
//         console.error('Get results error:', error);
//         res.status(500).json({
//             error: 'Internal server error',
//             message: 'Failed to retrieve results'
//         });
//     }
// };

// /**
//  * escapeRegex — escapes all special regex metacharacters in a string.
//  * Prevents ReDoS attacks from user-supplied search queries.
//  */
// function escapeRegex(str) {
//     return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// exports.searchPapers = async (req, res) => {
//     try {
//         const userId = getUserId(req);
//         const { query } = req.body;

//         // Validate: query must be a non-empty string, max 200 chars
//         if (!query || typeof query !== 'string') {
//             return res.status(400).json({ error: 'Search query is required.' });
//         }
//         if (query.trim().length === 0) {
//             return res.status(400).json({ error: 'Search query cannot be empty.' });
//         }
//         if (query.length > 200) {
//             return res.status(400).json({ error: 'Search query is too long (max 200 characters).' });
//         }

//         // Escape special regex characters before building the pattern
//         const safeQuery = escapeRegex(query.trim());
//         const searchRegex = new RegExp(safeQuery, 'i');

//         const papers = await PaperInfo.find({
//             userId: userId,
//             $or: [
//                 { 'College Name': searchRegex },
//                 { 'Branch': searchRegex },
//                 { 'Course Name': searchRegex },
//                 { 'Course Code': searchRegex },
//             ]
//         }).lean();

//         res.json(papers);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

//version3

/**
 * POST /upload/totext
 * Accepts an Excel/CSV file + Sequence + FormData, runs Structurize + Evaluate,
 * persists the resulting paper, and returns the evaluation result.
 */
const path = require('node:path');
const fs = require('node:fs');
const { Structurize } = require('../core/Regex/Regex');
const PaperInfo = require('../Model/PaperInfo');
const User = require('../Model/user');
const { Evaluate } = require('../core/evaluate/evaluate');
const escapeRegex = require('../utils/escapeRegex');
const { tryAcquire, release } = require('../utils/uploadGate');
const { getUserId, getCollegeId, isTeacher } = require('../utils/currentUser');
const paperFields = require('../core/constants/paperFields');
const { createNotification } = require('./notificationController');

/**
 * POST /upload/totext
 * ...
 */
exports.convertToText = async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: "No file uploaded." });
    }

    const userId = getUserId(req);

    console.log("✅ Received POST /upload/totext");
    console.log("req.body keys:", Object.keys(req.body));
    console.log("userId:", userId);

    const inputFileName = req.file.originalname;
    const fileExtension = path.extname(inputFileName).toLowerCase();
    const supportedExtensions = ['.xlsx', '.xls', '.csv'];

    if (!supportedExtensions.includes(fileExtension)) {
        cleanupTempFile(req.file);
        return res.status(400).send({
            error: "Invalid File Format",
            message: "Only Excel/CSV files (.xlsx, .xls, .csv) are supported."
        });
    }

    // Reject if too many parses are already running. A 25 MB XLSX can
    // consume 100–250 MB of heap during Structurize(); concurrent parses
    // are the real OOM risk, not the HTTP layer.
    if (!tryAcquire()) {
        cleanupTempFile(req.file);
        return res.status(503).json({
            error: true,
            message: 'Server is busy processing other uploads. Please try again in a moment.',
        });
    }

    try {
        const outputDir = path.join(__dirname, '../Converted');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const collegeId = getCollegeId(req) || null;
        const result = await saveToDB(userId, req.body.Sequence, req.body.FormData, req.file.path, collegeId);
        if (result.error) {
            return res.status(500).send(result);
        }

        return res.send(result);

    } catch (error) {
        console.error('Error during conversion or DB save:', error);
        return res.status(500).send({ error: "Server error while processing file" });
    } finally {
        release();
        cleanupTempFile(req.file);
    }
};

/**
 * Best-effort cleanup of the temp file multer wrote to disk.
 * Failures are non-fatal and logged.
 */
function cleanupTempFile(file) {
    if (file?.path && fs.existsSync(file.path)) {
        try {
            fs.unlinkSync(file.path);
        } catch (unlinkErr) {
            console.warn('Failed to clean up temp upload file:', unlinkErr.message);
        }
    }
}

/**
 * Parse the incoming Sequence + FormData, extract COs and module hours,
 * run Structurize + Evaluate, then persist the resulting paper.
 */
const saveToDB = async (userId, Sequence, FormData, filePath, collegeId = null) => {
    try {
        // ─── Step 1: Parse Input JSON ─────────────────────
        let sequenceArray;
        let formData;

        try {
            sequenceArray = JSON.parse(Sequence);
            formData = JSON.parse(FormData);
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            return { error: "Invalid JSON in Sequence or FormData" };
        }

        const coWeights = {};
        const moduleHours = {};
        const coDetails = {};

        // ─── Step 2: Extract COs and Modules ─────────────
        sequenceArray.forEach((item) => {
            const match = item.name.match(/\d+/);
            if (!match) return;

            const number = match[0];

            if (item.type === 'CO') {
                const coKey = `CO${number}`;
                const weight = Number.parseFloat(item.weight || 0);

                let rawBlooms;
                if (Array.isArray(item.blooms)) {
                    rawBlooms = item.blooms;
                } else if (typeof item.blooms === 'string') {
                    rawBlooms = [item.blooms];
                } else {
                    rawBlooms = [];
                }

                const blooms = rawBlooms
                    .filter((b) => typeof b === 'string')
                    .map((b) => b.toLowerCase());

                coWeights[coKey] = weight;
                coDetails[coKey] = { weight, blooms };
            } else if (item.type === 'Module') {
                moduleHours[`M${number}`] = Number.parseFloat(item.hours || 0);
            }
        });

        // ─── Step 3: Standard Bloom's Taxonomy Map ────────
        const bloomLevelMap = {
            remember: 1,
            understand: 2,
            apply: 3,
            analyze: 4,
            evaluate: 5,
            create: 6,
        };

        console.log("Bloom Level Map:", bloomLevelMap);

        // ─── Step 4: Structurize Excel file ───────────────
        const questionData = await Structurize([], filePath, bloomLevelMap);
        console.log("Questions after structurize:", questionData.length);

        // ─── Step 5: Evaluate (awaited) ───────────────────
        const evaluationResult = await Evaluate(questionData, coDetails, moduleHours, bloomLevelMap);
        console.log("Evaluation complete. FinalScore:", evaluationResult.FinalScore);
        console.log("DomainInsights present:", !!evaluationResult.DomainInsights);

        // ─── Step 6: Resolve college reference & Save to MongoDB ───
        let effectiveCollegeId = collegeId;
        if (!effectiveCollegeId && userId) {
            const userDoc = await User.findById(userId).select('collegeId collegeName').lean();
            if (userDoc) {
                effectiveCollegeId = userDoc.collegeId || null;
                if (!formData[paperFields.COLLEGE_NAME] && userDoc.collegeName) {
                    formData[paperFields.COLLEGE_NAME] = userDoc.collegeName;
                }
            }
        }

        const paper = new PaperInfo({
            "College Name": formData[paperFields.COLLEGE_NAME] || 'N/A',
            "Branch": formData.Branch,
            "Year Of Study": formData[paperFields.YEAR_OF_STUDY],
            "Semester": formData.Semester,
            "Course Name": formData[paperFields.COURSE_NAME],
            "Course Code": formData[paperFields.COURSE_CODE],
            "Course Teacher": formData[paperFields.COURSE_TEACHER],
            Sequence: {
                COs: coDetails,
                ModuleHours: moduleHours
            },
            bloomLevelMap: bloomLevelMap,
            qualityScore: evaluationResult.FinalScore || 0,
            [paperFields.COLLECTED_DATA]: [evaluationResult],
            "userId": userId,
            collegeId: effectiveCollegeId,

            // ─── Bloom's recommendations + correction audit ───
            BloomRecommendations: evaluationResult.BloomRecommendations || null,
            appliedCorrections:   evaluationResult.appliedCorrections   || [],
            correctionsSummary:   evaluationResult.correctionsSummary   || null,
        });

        await paper.save();
        console.log("✅ Paper saved to MongoDB");

                // ── Notify all reviewers in this college (fire-and-forget) ──
        if (effectiveCollegeId) {
          User.find({ collegeId: effectiveCollegeId, role: { $in: ['reviewer', 'admin'] } })
            .select('_id')
            .lean()
            .then((reviewers) => {
              const courseName = formData['Course Name'] || 'Untitled';
              for (const r of reviewers) {
                createNotification({
                  userId: r._id,
                  type: 'paper_submitted',
                  title: 'New paper submitted',
                  message: `"${courseName}" is awaiting review.`,
                  relatedDocId: paper._id,
                  actionUrl: `/reviewer/papers/${paper._id}`,
                }).catch(() => {});
              }
            })
            .catch((err) => console.error('[notification.paperSubmitted]', err.message));
        }

        return {
            success: true,
            data: {
                "Collected Data": [evaluationResult],
                Sequence: { COs: coDetails, ModuleHours: moduleHours },
                bloomLevelMap: bloomLevelMap,
                _id: paper._id,
                BloomRecommendations: evaluationResult.BloomRecommendations || null,
                appliedCorrections:   evaluationResult.appliedCorrections   || [],
                correctionsSummary:   evaluationResult.correctionsSummary   || null,
            }
        };

    } catch (error) {
        console.error("Error in saveToDB:", error);
        return { error: "Failed to process and save data", details: error.message };
    }
};

/**
 * GET /upload/totext
 * Returns the most recent paper evaluation for the authenticated user.
 */
exports.getResults = async (req, res) => {
    try {
        const userId = getUserId(req) ?? 'anonymous';

        const userResults = await PaperInfo.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        if (userResults.length === 0) {
            return res.status(404).json({
                error: 'No results found',
                message: 'No analysis results found for your account'
            });
        }

        const latestResult = userResults[0];
        const { extractedText, ...responseData } = latestResult;

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve results'
        });
    }
};

/**
 * GET /upload/all
 * Returns all paper evaluations for the authenticated user.
 */
exports.getResultsById = async (req, res) => {
    try {
        const userId = getUserId(req) ?? 'anonymous';

        const userResults = await PaperInfo.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        if (userResults.length === 0) {
            return res.status(404).json({
                error: 'No results found',
                message: 'No analysis results found for your account'
            });
        }

        const results = userResults.map(({ extractedText, ...rest }) => rest);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve results'
        });
    }
};

/**
 * POST /upload/search
 * Search the authenticated user's papers by course/branch/college/code.
 * Query is regex-escaped to prevent ReDoS, and capped at 200 chars.
 */
exports.searchPapers = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { query } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required.' });
        }
        if (query.trim().length === 0) {
            return res.status(400).json({ error: 'Search query cannot be empty.' });
        }
        if (query.length > 200) {
            return res.status(400).json({ error: 'Search query is too long (max 200 characters).' });
        }

        const safeQuery = escapeRegex(query.trim());
        const searchRegex = new RegExp(safeQuery, 'i');

        const papers = await PaperInfo.find({
            userId: userId,
            $or: [
                { [paperFields.COLLEGE_NAME]: searchRegex },
                { 'Branch': searchRegex },
                { [paperFields.COURSE_NAME]: searchRegex },
                { [paperFields.COURSE_CODE]: searchRegex },
            ]
        }).lean();

        res.json(papers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};