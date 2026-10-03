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
const logger = require('../config/logger');
const { paginate, getPaginationMeta } = require('../utils/pagination');

/**
 * POST /upload/totext
 * ...
 */
exports.convertToText = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: true,
            message: 'No file uploaded.',
        });
    }

    const userId = getUserId(req);

    const inputFileName = req.file.originalname;
    const fileExtension = path.extname(inputFileName).toLowerCase();
    const supportedExtensions = ['.xlsx', '.xls', '.csv'];

    if (!supportedExtensions.includes(fileExtension)) {
        cleanupTempFile(req.file);

        return res.status(400).json({
            error: true,
            message: 'Only Excel/CSV files (.xlsx, .xls, .csv) are supported.',
        });
    }

    try {
        const validSignature = await hasValidSpreadsheetSignature(
            req.file.path,
            fileExtension
        );

        if (!validSignature) {
            cleanupTempFile(req.file);

            return res.status(400).json({
                error: true,
                message:
                    'Uploaded file contents do not match the declared spreadsheet type.',
            });
        }
    } catch (signatureErr) {
        cleanupTempFile(req.file);

        logger.warn(
            { err: signatureErr },
            'File signature validation error'
        );

        return res.status(400).json({
            error: true,
            message: 'Unable to validate the uploaded file.',
        });
    }

    // Reject if too many parses are already running. A 25 MB XLSX can
    // consume 100–250 MB of heap during Structurize(); concurrent parses
    // are the real OOM risk, not the HTTP layer.
    if (!tryAcquire()) {
        cleanupTempFile(req.file);

        return res.status(503).json({
            error: true,
            message:
                'Server is busy processing other uploads. Please try again in a moment.',
        });
    }

    try {
        const collegeId = getCollegeId(req) || null;

        const result = await saveToDB(
            userId,
            req.body.Sequence,
            req.body.FormData,
            req.file.path,
            collegeId
        );

        if (result.error) {
            return res.status(result.status || 500).json({
                error: true,
                message: result.error,
            });
        }

        return res.send(result);
    } catch (error) {
        logger.error(
            { err: error },
            'Error during conversion or DB save'
        );

        return res.status(500).json({
            error: 'Server error while processing file',
        });
    } finally {
        release();
        cleanupTempFile(req.file);
    }
};

/**
 * Validate that the uploaded file matches its declared extension.
 */
async function hasValidSpreadsheetSignature(filePath, fileExtension) {
    const handle = await fs.promises.open(filePath, 'r');

    try {
        const header = Buffer.alloc(16);

        const { bytesRead } = await handle.read(
            header,
            0,
            header.length,
            0
        );

        if (fileExtension === '.xlsx') {
            // XLSX is a ZIP-based Open XML document.
            return (
                bytesRead >= 4 &&
                header[0] === 0x50 &&
                header[1] === 0x4b &&
                [0x03, 0x05, 0x07].includes(header[2])
            );
        }

        if (fileExtension === '.xls') {
            // Legacy Excel files use the OLE Compound File header.
            return (
                bytesRead >= 8 &&
                header.subarray(0, 8).equals(
                    Buffer.from([
                        0xd0,
                        0xcf,
                        0x11,
                        0xe0,
                        0xa1,
                        0xb1,
                        0x1a,
                        0xe1,
                    ])
                )
            );
        }

        if (fileExtension === '.csv') {
            if (bytesRead === 0) return true;

            const sample = header.subarray(0, bytesRead);

            // CSV is a text format; reject obvious binary content.
            return !sample.includes(0x00);
        }

        return false;
    } finally {
        await handle.close();
    }
}

/**
 * Best-effort cleanup of the temp file multer wrote to disk.
 * Failures are non-fatal and logged.
 */
function cleanupTempFile(file) {
    if (file?.path && fs.existsSync(file.path)) {
        try {
            fs.unlinkSync(file.path);
        } catch (unlinkErr) {
            console.warn(
                'Failed to clean up temp upload file:',
                unlinkErr.message
            );
        }
    }
}

/**
 * Parse the incoming Sequence + FormData, extract COs and module hours,
 * run Structurize + Evaluate, then persist the resulting paper.
 */
const saveToDB = async (
    userId,
    Sequence,
    FormData,
    filePath,
    collegeId = null
) => {
    try {
        // ─── Step 1: Parse Input JSON ────────────────────────────────
        let sequenceArray;
        let formData;

        try {
            sequenceArray = JSON.parse(Sequence);
            formData = JSON.parse(FormData);
        } catch (parseErr) {
            logger.debug(
                { err: parseErr },
                'Invalid upload metadata JSON'
            );

            return {
                status: 400,
                error: 'Invalid JSON in Sequence or FormData',
            };
        }

        if (!Array.isArray(sequenceArray)) {
            return {
                status: 400,
                error: 'Sequence must be an array',
            };
        }

        if (!formData || typeof formData !== 'object') {
            return {
                status: 400,
                error: 'FormData must be a valid object',
            };
        }

        const moduleHours = {};
        const moduleNames = {};
        const coDetails = {};

        // ─── Step 2: Extract COs and Modules ─────────────────────────
        sequenceArray.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            const itemName = String(item.name || '');
            const match = itemName.match(/\d+/);

            if (!match) {
                return;
            }

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
                    .map((b) => b.toLowerCase().trim())
                    .filter(Boolean);

                coDetails[coKey] = {
                    weight,
                    blooms,
                };
            } else if (item.type === 'Module') {
                const moduleKey = `M${number}`;

                moduleHours[moduleKey] = Number.parseFloat(
                    item.hours || 0
                );

                moduleNames[moduleKey] = String(
                    item.moduleName || item.name || ''
                ).trim();
            }
        });

        // ─── Step 3: Standard Bloom's Taxonomy Map ───────────────────
        const bloomLevelMap = {
            remember: 1,
            understand: 2,
            apply: 3,
            analyze: 4,
            evaluate: 5,
            create: 6,
        };

        // ─── Step 4: Structurize Excel file ─────────────────────────
        const questionData = await Structurize(
            [],
            filePath,
            bloomLevelMap
        );

        // ─── Step 5: Resolve effective college before evaluation ─────
        // This is important for DomainInsights / learned-verb scoping.
        let effectiveCollegeId = collegeId || null;

        if (!effectiveCollegeId && userId) {
            const userDoc = await User.findById(userId)
                .select('collegeId collegeName')
                .lean();

            if (userDoc) {
                effectiveCollegeId = userDoc.collegeId || null;

                if (
                    !formData[paperFields.COLLEGE_NAME] &&
                    userDoc.collegeName
                ) {
                    formData[paperFields.COLLEGE_NAME] =
                        userDoc.collegeName;
                }
            }
        }

        // ─── Step 6: Evaluate ────────────────────────────────────────
        // Pass the effective college so Evaluate can load:
        // - global learned verbs
        // - current-college learned verbs
        // while preventing cross-college leakage.
        const evaluationResult = await Evaluate(
            questionData,
            coDetails,
            moduleHours,
            bloomLevelMap,
            {
                collegeId: effectiveCollegeId,
            }
        );

        // ─── Step 7: Save to MongoDB ─────────────────────────────────
        const paper = new PaperInfo({
            'College Name':
                formData[paperFields.COLLEGE_NAME] || 'N/A',

            Branch: formData.Branch,

            'Year Of Study':
                formData[paperFields.YEAR_OF_STUDY],

            Semester: formData.Semester,

            'Course Name':
                formData[paperFields.COURSE_NAME],

            'Course Code':
                formData[paperFields.COURSE_CODE],

            'Course Teacher':
                formData[paperFields.COURSE_TEACHER],

            Sequence: {
                COs: coDetails,
                ModuleHours: moduleHours,
                ModuleNames: moduleNames,
            },

            bloomLevelMap,

            qualityScore: evaluationResult.FinalScore || 0,

            [paperFields.COLLECTED_DATA]: [evaluationResult],

            userId,

            collegeId: effectiveCollegeId,

            // ─── Bloom recommendations + correction audit ───────────
            BloomRecommendations:
                evaluationResult.BloomRecommendations || null,

            appliedCorrections:
                evaluationResult.appliedCorrections || [],

            correctionsSummary:
                evaluationResult.correctionsSummary || null,
        });

        await paper.save();

        // NOTE: reviewers are notified when the teacher submits the paper
        // for review (teacherController.submitPaperForReview), not at upload
        // time because the paper is still a draft.

        return {
            success: true,

            data: {
                'Collected Data': [evaluationResult],

                Sequence: {
                    COs: coDetails,
                    ModuleHours: moduleHours,
                    ModuleNames: moduleNames,
                },

                bloomLevelMap,

                _id: paper._id,

                BloomRecommendations:
                    evaluationResult.BloomRecommendations || null,

                appliedCorrections:
                    evaluationResult.appliedCorrections || [],

                correctionsSummary:
                    evaluationResult.correctionsSummary || null,
            },
        };
    } catch (error) {
        logger.error(
            { err: error },
            'Error in saveToDB'
        );

        return {
            error: 'Failed to process and save data',
        };
    }
};

/**
 * GET /upload/totext
 * Returns the most recent paper evaluation for the authenticated user.
 */
exports.getResults = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required.',
            });
        }

        const latestResult = await PaperInfo.findOne({ userId })
            .sort({ createdAt: -1 })
            .lean();

        if (!latestResult) {
            return res.status(404).json({
                error: true,
                message: 'No analysis results found for your account',
            });
        }

        const { extractedText, ...responseData } = latestResult;

        return res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        logger.error(
            { err: error },
            'Get results error'
        );

        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve results',
        });
    }
};

/**
 * GET /upload/all
 * Returns all paper evaluations for the authenticated user.
 */
exports.getResultsById = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required.',
            });
        }

        const { skip, limit, page } = paginate(req, 20, 100);

        const [userResults, total] = await Promise.all([
            PaperInfo.find({ userId })
                .select('-extractedText')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            PaperInfo.countDocuments({ userId }),
        ]);

        if (userResults.length === 0) {
            return res.status(404).json({
                error: true,
                message: 'No analysis results found for your account',
            });
        }

        return res.json({
            success: true,
            data: userResults,
            pagination: getPaginationMeta(
                total,
                page,
                limit
            ),
        });
    } catch (error) {
        logger.error(
            { err: error },
            'Get results error'
        );

        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve results',
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
        const { query } = req.body || {};

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                error: 'Search query is required.',
            });
        }

        if (query.trim().length === 0) {
            return res.status(400).json({
                error: 'Search query cannot be empty.',
            });
        }

        if (query.length > 200) {
            return res.status(400).json({
                error:
                    'Search query is too long (max 200 characters).',
            });
        }

        const safeQuery = escapeRegex(query.trim());
        const searchRegex = new RegExp(safeQuery, 'i');

        const papers = await PaperInfo.find({
            userId,
            $or: [
                {
                    [paperFields.COLLEGE_NAME]: searchRegex,
                },
                {
                    Branch: searchRegex,
                },
                {
                    [paperFields.COURSE_NAME]: searchRegex,
                },
                {
                    [paperFields.COURSE_CODE]: searchRegex,
                },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.json(papers);
    } catch (error) {
        logger.error(
            { err: error },
            'searchPapers error'
        );

        return res.status(500).json({
            error: 'Failed to search papers',
        });
    }
};