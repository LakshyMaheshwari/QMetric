// //Version-2
// const fs = require('fs');
// const xlsx = require('xlsx');
// const { spawnSync } = require('child_process');

// // Bloom's taxonomy verbs by category
// const bloomsTaxonomyVerbs = {
//     "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
//     "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
//     "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
//     "analyze": ["analyze", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
//     "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
//     "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate"]
// };

// function extractVerbsPython(text) {
//     const result = spawnSync('python', ['extraction_logic.py', text], { encoding: 'utf-8' });
//     if (result.error) {
//         console.error('Python error:', result.error);
//         return [];
//     }
//     return result.stdout.trim().split(',').filter(Boolean);
// }

// // Function to structurize and process the Excel data
// exports.Structurize = (data, inputFile, bloomLevelMap) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const workbook = xlsx.readFile(inputFile);
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];

//             // Convert the sheet into a JSON array
//             const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

//             const StructurizedData = tableData.map(row => {
//                 const questionText = row.question || row.Question || row.QUESTION || '';

//                 if (!questionText) {
//                     console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
//                     return null; // Skip this row if no question text is found
//                 }

//                 const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

//                 const moduleNumber = row.Module !== undefined && row.Module !== null
//                 ? String(row.Module).trim()
//                 : 'N/A';

//                 // Return structured data for each row, ensuring no null values
//                 return questionText ? {
//                     ...row,
//                     "Bloom's Verbs": bloom.words,
//                     "Bloom's Taxonomy Level": bloom.highestLevel,
//                     "Bloom's Highest Verb": bloom.highestVerb,
//                     "Module": moduleNumber 
//                 } : null;
//             }).filter(row => row !== null); 

//             resolve(StructurizedData);
//         } catch (error) {
//             reject(`Error processing the file: ${error.message}`);
//         }
//     });
// };

// // Helper to find level name from verb
// function findBloomLevel(word, bloomLevelMap) {
//     for (const level in bloomsTaxonomyVerbs) {
//         if (bloomsTaxonomyVerbs[level].includes(word)) {
//             return level;
//         }
//     }
//     return "Not Found";
// }

// // Public method to analyze Bloom level in a sentence
// exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
//     const words = text.split(/\W+/); // Simple tokenization
//     const wordResult = [];
//     const levelResult = [];
//     let highestLevel = Infinity; // Start with the highest possible value

//     let highestVerb = null;

//     for (const word of words) {
//         const lowerWord = word.toLowerCase();
//         const level = findBloomLevel(lowerWord, bloomLevelMap);

//         if (level !== "Not Found") {
//             const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
//             wordResult.push(word);
//             levelResult.push(levelIndex);
//             if(levelIndex < highestLevel){
//                 highestVerb = word;
//             }
//             highestLevel = Math.min(highestLevel, levelIndex);

//             // Check if this word is a verb and if it has the highest bloom level so far

//         }
//     }

//     return {
//         words: wordResult.join(", "),
//         levels: levelResult.join(", "),
//         highestLevel,
//         highestVerb,
//     };
// };


// // Helper to convert level to number using bloomLevelMap
// function getBloomLevelIndex(level, bloomLevelMap) {
//     return bloomLevelMap[level] || Infinity; 
// }



// // curl -X POST http://qmetric-2.onrender.com/upload/totext ^ -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODY0MWNiMGFjYTk4ZTc5NzRhYzhhZjYiLCJpYXQiOjE3NjA4OTE2NjAsImV4cCI6MTc2MTE1MDg2MH0.Lt5uC8PGMZCqUkwc3xst8iUSsn2JA2Y-MIYDyY95MBg" ^ -F "file=@C:\Users\user\Downloads\sample.xlsx" ^ -F "Sequence=[{\"name\":\"CO1\",\"type\":\"CO\",\"weight\":50,\"blooms\":[\"understand\"]},{\"name\":\"CO2\",\"type\":\"CO\",\"weight\":30,\"blooms\":[\"Apply\"]},{\"name\":\"CO3\",\"type\":\"CO\",\"weight\":20,\"blooms\":[\"Analyse\"]},{\"name\":\"Module1\",\"type\":\"Module\",\"hours\":10},{\"name\":\"Module2\",\"type\":\"Module\",\"hours\":15}]" ^ -F "FormData={\"College Name\":\"XYZ College\",\"Branch\":\"Computer Science\",\"Year Of Study\":\"2nd Year\",\"Semester\":\"3rd\",\"Course Name\":\"Data Structures\",\"Course Code\":\"CS201\",\"Course Teacher\":\"Dr. Smith\"}"


// //Version-3
// const fs = require('fs');
// const xlsx = require('xlsx');
// const { spawnSync } = require('child_process');

// // Bloom's taxonomy verbs by category
// const bloomsTaxonomyVerbs = {
//     "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
//     "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
//     "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
//     "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
//     "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
//     "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
// };

// // Helper: Extract verbs from text using Python spaCy
// function extractVerbsPython(text) {
//     const result = spawnSync('python', ['extraction_logic.py', text], { encoding: 'utf-8' });
//     if (result.error) {
//         console.error('Python error:', result.error);
//         return [];
//     }
//     return result.stdout.trim().split(',').filter(Boolean);
// }

// // Function to structurize and process the Excel data
// exports.Structurize = (data, inputFile, bloomLevelMap) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const workbook = xlsx.readFile(inputFile);
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];

//             // Convert the sheet into a JSON array
//             const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

//             const StructurizedData = tableData.map(row => {
//                 const questionText = row.question || row.Question || row.QUESTION || '';

//                 if (!questionText) {
//                     console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
//                     return null; // Skip this row if no question text is found
//                 }

//                 const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

//                 const moduleNumber = row.Module !== undefined && row.Module !== null
//                     ? String(row.Module).trim()
//                     : 'N/A';

//                 // Extract verbs using Python spaCy
//                 const extractedVerbs = extractVerbsPython(questionText);

//                 // Return structured data for each row, ensuring no null values
//                 return questionText ? {
//                     ...row,
//                     "Bloom's Verbs": bloom.words,
//                     "Bloom's Taxonomy Level": bloom.highestLevel,
//                     "Bloom's Highest Verb": bloom.highestVerb,
//                     "Module": moduleNumber,
//                     "Extracted Verbs": extractedVerbs.join(', ')
//                 } : null;
//             }).filter(row => row !== null); 

//             resolve(StructurizedData);
//         } catch (error) {
//             reject(`Error processing the file: ${error.message}`);
//         }
//     });
// };

// // Helper to find level name from verb
// function findBloomLevel(word, bloomLevelMap) {
//     for (const level in bloomsTaxonomyVerbs) {
//         if (bloomsTaxonomyVerbs[level].includes(word)) {
//             return level;
//         }
//     }
//     return "Not Found";
// }

// // Public method to analyze Bloom level in a sentence
// exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
//     const words = text.split(/\W+/); // Simple tokenization
//     const wordResult = [];
//     const levelResult = [];
//     let highestLevel = Infinity; // Start with the highest possible value

//     let highestVerb = null;

//     for (const word of words) {
//         const lowerWord = word.toLowerCase();
//         const level = findBloomLevel(lowerWord, bloomLevelMap);

//         if (level !== "Not Found") {
//             const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
//             wordResult.push(word);
//             levelResult.push(levelIndex);
//             if(levelIndex < highestLevel){
//                 highestVerb = word;
//             }
//             highestLevel = Math.min(highestLevel, levelIndex);
//         }
//     }

//     return {
//         words: wordResult.join(", "),
//         levels: levelResult.join(", "),
//         highestLevel,
//         highestVerb,
//     };
// };

// // Helper to convert level to number using bloomLevelMap
// function getBloomLevelIndex(level, bloomLevelMap) {
//     return bloomLevelMap[level] || Infinity; 
// }

//Version-4
//Version-3
// const fs = require('fs');
// const xlsx = require('xlsx');
// // const { spawnSync } = require('child_process');

// // Bloom's taxonomy verbs by category
// const bloomsTaxonomyVerbs = {
//     "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
//     "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
//     "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
//     "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
//     "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
//     "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
// };

// // Helper: Extract verbs from text using Python spaCy
// // function extractVerbsPython(text) {
// //     const result = spawnSync('python', ['extraction_logic.py', text], { encoding: 'utf-8' });
// //     if (result.error) {
// //         console.error('Python error:', result.error);
// //         return [];
// //     }
// //     return result.stdout.trim().split(',').filter(Boolean);
// // }

// // Function to structurize and process the Excel data
// exports.Structurize = (data, inputFile, bloomLevelMap) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const workbook = xlsx.readFile(inputFile);
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];

//             // Convert the sheet into a JSON array
//             const tableData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

//             const StructurizedData = tableData.map(row => {
//                 const questionText = row.question || row.Question || row.QUESTION || '';

//                 if (!questionText) {
//                     console.warn(`Missing question text for row: ${JSON.stringify(row)}`);
//                     return null;
//                 }

//                 const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

//                 const moduleNumber = row.Module !== undefined && row.Module !== null
//                     ? String(row.Module).trim()
//                     : 'N/A';

//                 // Extract verbs using Python spaCy
//                 // const extractedVerbs = extractVerbsPython(questionText);

//                 // Return structured data for each row
//                 return questionText ? {
//                     ...row,
//                     "Bloom's Verbs": bloom.words,
//                     "Bloom's Taxonomy Level": bloom.highestLevel,
//                     "Bloom's Highest Verb": bloom.highestVerb,
//                     "Module": moduleNumber,
//                     // "Extracted Verbs": extractedVerbs.join(', ')
//                 } : null;
//             }).filter(row => row !== null);

//             resolve(StructurizedData);
//         } catch (error) {
//             reject(`Error processing the file: ${error.message}`);
//         }
//     });
// };

// // Helper to find level name from verb
// function findBloomLevel(word, bloomLevelMap) {
//     for (const level in bloomsTaxonomyVerbs) {
//         if (bloomsTaxonomyVerbs[level].includes(word)) {
//             return level;
//         }
//     }
//     return "Not Found";
// }

// // Public method to analyze Bloom level in a sentence
// exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
//     const words = text.split(/\W+/);
//     const wordResult = [];
//     const levelResult = [];
//     let highestLevel = 7;
//     let highestVerb = null;

//     for (const word of words) {
//         const lowerWord = word.toLowerCase();
//         const level = findBloomLevel(lowerWord, bloomLevelMap);

//         if (level !== "Not Found") {
//             const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
//             wordResult.push(word);
//             levelResult.push(levelIndex);

//             if (levelIndex < highestLevel) {
//                 highestLevel = levelIndex;
//                 highestVerb = word;
//             }
//         }
//     }

//     // If no Bloom verbs found, assign default level 6
//     if (highestLevel === Infinity || highestLevel === 7) {
//         console.warn(`Warning: No Bloom verbs found in: "${text.substring(0, 50)}..."`);
//         highestLevel = 6;
//         highestVerb = "N/A";
//     }

//     return {
//         words: wordResult.join(", ") || "None",
//         levels: levelResult.join(", ") || "None",
//         highestLevel,
//         highestVerb: highestVerb || "N/A",
//     };
// };

// // Helper to convert level to number using bloomLevelMap
// function getBloomLevelIndex(level, bloomLevelMap) {
//     const mappedLevel = bloomLevelMap[level];

//     if (mappedLevel === undefined) {
//         console.warn(`Warning: Bloom level "${level}" not found in bloomLevelMap, defaulting to 6`);
//         return 6;
//     }

//     return mappedLevel;
// }

/**
 * Regex.js — Excel parser + Bloom's level classifier
 * 
 * Purpose:
 *   - Parse uploaded Excel/CSV question papers into structured data
 *   - Assign Bloom's cognitive level (1–6) to each question
 *   - Output normalized objects with Question, CO, Marks, Module, Bloom's fields
 * 
 * Note:
 *   - Python-based verb extraction (extractVerbsPython) has been REMOVED.
 *     Domain classification is now handled by backend/core/nlp/verbClassifier.js
 */

/**
 * Regex.js — Excel parser + Bloom's level classifier
 *
 * Purpose:
 *   - Parse uploaded Excel/CSV question papers into structured data
 *   - Assign Bloom's cognitive level (1–6) to each question
 *   - Output normalized objects with Question, CO, Marks, Module, Bloom's fields
 *
 * Note:
 *   - Python-based verb extraction (extractVerbsPython) has been REMOVED.
 *     Domain classification is now handled by backend/core/nlp/verbClassifier.js
 */

const paperFields = require('../constants/paperFields');
const xlsx = require('xlsx');

// ═══════════════════════════════════════════════════════════════════
// BLOOM'S TAXONOMY VERBS (used for cognitive level detection)
// ═══════════════════════════════════════════════════════════════════
const bloomsTaxonomyVerbs = {
    "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
    "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
    "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
    "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
    "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
    "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
};

// ═══════════════════════════════════════════════════════════════════
// STRUCTURIZE — Parse Excel/CSV into structured question list
// ═══════════════════════════════════════════════════════════════════
exports.Structurize = (data, inputFile, bloomLevelMap) => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = xlsx.readFile(inputFile);

            console.log('=== EXCEL PARSE DEBUG ===');
            console.log('File:', inputFile);
            console.log('All sheets:', workbook.SheetNames);

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                console.log('❌ No sheets found in workbook');
                return resolve([]);
            }

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            console.log('Using sheet:', sheetName);

            // ─── Step 1: Read raw grid to inspect structure ──────
            const rawGrid = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            console.log('Raw rows:', rawGrid.length);

            if (rawGrid.length === 0) {
                console.log('❌ Sheet is empty');
                return resolve([]);
            }

            console.log('First 3 raw rows:', JSON.stringify(rawGrid.slice(0, 3), null, 2));

            // ─── Step 2: Auto-detect header row ──────────────────
            // Look for a row containing a "question" column header
            let headerRowIndex = 0;
            let headerFound = false;
            const searchLimit = Math.min(10, rawGrid.length);

            for (let i = 0; i < searchLimit; i++) {
                const row = rawGrid[i];
                if (!Array.isArray(row)) continue;

                const hasQuestionCol = row.some((cell) => {
                    const s = String(cell).trim().toLowerCase();
                    return s === 'question' || s === 'questions' || s === 'question text';
                });

                if (hasQuestionCol) {
                    headerRowIndex = i;
                    headerFound = true;
                    break;
                }
            }

            if (!headerFound) {
                console.warn('⚠️ No "Question" column found in first 10 rows — using row 0 as header');
            }

            console.log('Header row index:', headerRowIndex);

            // ─── Step 3: Parse with detected header row ──────────
            const tableData = xlsx.utils.sheet_to_json(sheet, {
                defval: '',
                range: headerRowIndex,
            });

            console.log('Parsed data rows:', tableData.length);

            if (tableData.length === 0) {
                console.log('❌ No data rows after header');
                return resolve([]);
            }

            console.log('Detected column keys:', Object.keys(tableData[0]));
            console.log('First parsed row:', JSON.stringify(tableData[0], null, 2));

            // ─── Step 4: Case/space-insensitive cell lookup ──────
            const getCell = (row, ...possibleNames) => {
                const keys = Object.keys(row);
                for (const name of possibleNames) {
                    const match = keys.find((k) =>
                        String(k).trim().toLowerCase() === name.toLowerCase()
                    );
                    if (match && row[match] !== undefined && row[match] !== '') {
                        return row[match];
                    }
                }
                return '';
            };

            // ─── Step 5: Process each row ────────────────────────
            const StructurizedData = tableData
                .map((row, idx) => {
                    const questionText = String(
                        getCell(row, 'question', 'questions', 'question text', 'q', 'q.no', 'question no')
                    ).trim();

                    if (!questionText) {
                        console.warn(`Row ${idx + 1}: no question text — skipping`);
                        return null;
                    }

                    const bloom = exports.FindBloomLevelsInText(questionText, bloomLevelMap);

                    const moduleRaw = getCell(row, 'module', 'modules', 'unit', 'chapter', 'module no');
                    const moduleNumber = moduleRaw ? String(moduleRaw).trim() : 'N/A';

                    const coRaw = getCell(row, 'co', 'course outcome', 'co number', 'co no', 'c.o.');
                    const coValue = coRaw ? String(coRaw).trim() : '';

                    const marksRaw = getCell(row, 'marks', 'mark', 'weight', 'points', 'max marks');
                    const marksValue = marksRaw !== '' ? Number(marksRaw) || 0 : 0;

                    const difficultyRaw = getCell(row, 'difficulty', 'level', 'difficulty level');
                    const difficultyValue = difficultyRaw ? String(difficultyRaw).trim() : '';

                    const qTypeRaw = getCell(row, 'question type', 'type', 'qt');
                    const qTypeValue = qTypeRaw ? String(qTypeRaw).trim() : '';

                    return {
                        Question: questionText,
                        CO: coValue,
                        Marks: marksValue,
                        Module: moduleNumber,
                        Difficulty: difficultyValue,
                        [paperFields.QUESTION_TYPE]: qTypeValue,
                        [paperFields.BLOOMS_VERBS]: bloom.words,
                        [paperFields.BLOOMS_TAXONOMY_LEVEL]: bloom.highestLevel,
                        [paperFields.BLOOMS_HIGHEST_VERB]: bloom.highestVerb,
                    };
                })
                .filter((row) => row !== null);

            console.log('✅ Final question count:', StructurizedData.length);
            console.log('=========================');

            resolve(StructurizedData);
        } catch (error) {
            console.error('❌ Structurize error:', error);
            reject(new Error(`Error processing the file: ${error.message}`));
        }
    });
};

// ═══════════════════════════════════════════════════════════════════
// BLOOM'S LEVEL DETECTION (used by Structurize)
// ═══════════════════════════════════════════════════════════════════
function findBloomLevel(word, bloomLevelMap) {
    for (const level in bloomsTaxonomyVerbs) {
        if (bloomsTaxonomyVerbs[level].includes(word)) {
            return level;
        }
    }
    return "Not Found";
}

exports.FindBloomLevelsInText = (text, bloomLevelMap) => {
    const words = String(text).split(/\W+/);
    const wordResult = [];
    const levelResult = [];
    let highestLevel = 7;
    let highestVerb = null;

    for (const word of words) {
        const lowerWord = word.toLowerCase();
        const level = findBloomLevel(lowerWord, bloomLevelMap);

        if (level !== "Not Found") {
            const levelIndex = getBloomLevelIndex(level, bloomLevelMap);
            wordResult.push(word);
            levelResult.push(levelIndex);

            if (levelIndex < highestLevel) {
                highestLevel = levelIndex;
                highestVerb = word;
            }
        }
    }

    // If no Bloom verbs found, assign default level 6
    if (highestLevel === Infinity || highestLevel === 7) {
        console.warn(`Warning: No Bloom verbs found in: "${String(text).substring(0, 50)}..."`);
        highestLevel = 6;
        highestVerb = "N/A";
    }

    return {
        words: wordResult.join(", ") || "None",
        levels: levelResult.join(", ") || "None",
        highestLevel,
        highestVerb: highestVerb || "N/A",
    };
};

function getBloomLevelIndex(level, bloomLevelMap) {
    const mappedLevel = bloomLevelMap[level];

    if (mappedLevel === undefined) {
        console.warn(`Warning: Bloom level "${level}" not found in bloomLevelMap, defaulting to 6`);
        return 6;
    }

    return mappedLevel;
}