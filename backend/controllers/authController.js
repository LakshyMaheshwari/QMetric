const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');
const OCRLog = require('../Model/OCRLog');
const cloudinary = require('../config/cloudinary');
// Node 22 has a built-in global `fetch` — no import needed.

// ============================================================
// OCR HELPER FUNCTIONS
// ============================================================

/**
 * Normalize a string for comparison:
 * lowercase, trim, collapse multiple spaces, remove special chars
 */
function normalize(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/gi, '')  // remove special chars
        .replace(/\s+/g, ' ');          // collapse spaces
}

/**
 * Extract the full OCR text block from the Cloudinary response.
 * Path: result.info.ocr.adv_ocr.data[0].textAnnotations[0].description
 */
function extractOcrText(uploadResult) {
    try {
        const ocrData = uploadResult.info?.ocr?.adv_ocr?.data;
        if (!ocrData || !Array.isArray(ocrData) || ocrData.length === 0) {
            return '';
        }
        const textAnnotations = ocrData[0]?.textAnnotations;
        if (!textAnnotations || !Array.isArray(textAnnotations) || textAnnotations.length === 0) {
            return '';
        }
        // First annotation is the full text block
        return textAnnotations[0]?.description || '';
    } catch (err) {
        console.error('  OCR text extraction error:', err.message);
        return '';
    }
}

/**
 * Extract Full Name from OCR text.
 * Looks for patterns like "Name:", "Employee Name:", "Name of Employee:", "Staff Name:"
 */
function extractFullName(ocrText) {
    const patterns = [
        /(?:employee\s+name|staff\s+name|name\s+of\s+employee|name\s+of\s+staff|faculty\s+name|teacher\s+name|name)\s*[:\-–]\s*(.+)/i,
    ];
    for (const pattern of patterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
            // Take text up to end of line or next label
            const value = match[1].split(/\n/)[0].trim();
            // Remove trailing labels (e.g., "Dr. John Smith Dept:")
            return value.replace(/\b(dept|department|id|emp|employee|designation|branch|college|university)\s*[:\-–]/i, '').trim();
        }
    }
    return '';
}

/**
 * Extract Employee ID from OCR text.
 * Looks for: "ID:", "Emp ID:", "Employee ID:", "EMP NO:", "Employee No:",
 * "Staff ID:", "Registration No:", "Roll No:", "ID No:", "Emp Code:"
 */
function extractEmployeeId(ocrText) {
    const patterns = [
        /(?:emp(?:loyee)?\s*(?:id|no|code|number)|staff\s*(?:id|no|code)|registration\s*(?:id|no)|id\s*(?:no|number)|roll\s*no|faculty\s*id)\s*[:\-–]\s*([A-Z0-9\-\/]+)/i,
    ];
    for (const pattern of patterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '';
}

/**
 * Extract College Name from OCR text.
 * Looks for: "College:", "University:", "Institute:", "Institution:",
 * or common patterns like "XYZ College of Engineering"
 */
function extractCollegeName(ocrText) {
    const patterns = [
        /(?:college|university|institute|institution)\s*(?:name)?\s*[:\-–]\s*(.+)/i,
    ];
    for (const pattern of patterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
            return match[1].split(/\n/)[0].trim();
        }
    }

    // Fallback: look for lines containing "college", "university", "institute"
    const lines = ocrText.split('\n');
    for (const line of lines) {
        if (/\b(college|university|institute|institution)\b/i.test(line) && line.trim().length > 5) {
            return line.trim();
        }
    }
    return '';
}

/**
 * Extract Department from OCR text.
 * Looks for: "Dept:", "Department:", "Branch:", "Faculty:"
 */
function extractDepartment(ocrText) {
    const patterns = [
        /(?:dept|department|branch|faculty\s*of|division)\s*[:\-–]\s*(.+)/i,
    ];
    for (const pattern of patterns) {
        const match = ocrText.match(pattern);
        if (match && match[1]) {
            return match[1].split(/\n/)[0].trim();
        }
    }
    return '';
}

/**
 * Compare two strings with fuzzy matching.
 * Returns true if one string contains the other (case-insensitive, normalized).
 * Suitable for names, college names, departments — NOT for IDs.
 */
function fuzzyMatch(inputValue, extractedValue) {
    if (!inputValue || !extractedValue) return false;
    const a = normalize(inputValue);
    const b = normalize(extractedValue);
    if (!a || !b) return false;
    // Check if either string contains the other
    return a.includes(b) || b.includes(a);
}

/**
 * Exact token match for identifiers (Employee ID).
 * Splits text into tokens (by whitespace, slashes, dashes, commas, pipes)
 * and checks if the normalized user value exists as a whole token.
 * This prevents partial matches like '24610900' matching '246109009'.
 */
function exactTokenMatch(userValue, text) {
    if (!userValue || !text) return false;
    const normalizedUser = normalize(userValue);
    if (!normalizedUser) return false;
    // Split on common delimiters: whitespace, slash, dash, comma, pipe, colon, semicolon
    const tokens = normalize(text).split(/[\s\/\-,|;:]+/).filter(Boolean);
    return tokens.includes(normalizedUser);
}

/**
 * Run full OCR verification against user-provided inputs.
 * Returns the idVerification sub-document.
 */
function runOcrVerification(ocrText, userInputs) {
    const extractedData = {
        fullName: extractFullName(ocrText),
        employeeId: extractEmployeeId(ocrText),
        collegeName: extractCollegeName(ocrText),
        department: extractDepartment(ocrText),
    };

    const fieldsToCheck = ['fullName', 'employeeId', 'collegeName', 'department'];
    const matchedFields = [];
    let strictMatchCount = 0;
    let fallbackMatchCount = 0;
    
    const normalizedOcrText = normalize(ocrText);

    for (const field of fieldsToCheck) {
        const extracted = extractedData[field];
        const userValue = userInputs[field];
        
        let isMatch = false;

        // Employee ID requires exact matching; other fields use fuzzy (substring) matching
        const isIdField = (field === 'employeeId');

        // Step 1: Strict match (regex-extracted value vs user input)
        if (extracted && userValue) {
            const strictMatch = isIdField
                ? normalize(userValue) === normalize(extracted)  // exact equality for IDs
                : fuzzyMatch(userValue, extracted);              // substring ok for names
            if (strictMatch) {
                isMatch = true;
                strictMatchCount++;
            }
        }

        // Step 2: Fallback — search the full OCR text (only if strict didn't match)
        if (!isMatch && userValue) {
            let fallbackHit = false;

            if (isIdField) {
                // Token-level exact match: split OCR text into tokens and look for a whole match
                fallbackHit = exactTokenMatch(userValue, ocrText);
            } else {
                // Substring match for names / college / department
                const normalizedUserValue = normalize(userValue);
                fallbackHit = normalizedUserValue && normalizedOcrText.includes(normalizedUserValue);
            }

            if (fallbackHit) {
                isMatch = true;
                fallbackMatchCount++;
                // Capture the matched user value to store in extractedData
                extractedData[field] = userValue;
            } else {
                // If not found at all, reset the extractedData for this field to avoid confusion
                if (!extracted) {
                    extractedData[field] = '';
                }
            }
        }

        if (isMatch) {
            matchedFields.push(field);
        }
    }

    const totalMatches = strictMatchCount + fallbackMatchCount;
    let status = 'unverified';
    let confidence = 0;

    if (totalMatches === 4) {
        status = 'verified';
        confidence = strictMatchCount === 4 ? 100 : 95;
    } else if (totalMatches === 3) {
        status = 'flagged';
        confidence = 85;
    } else if (totalMatches === 2) {
        status = 'flagged';
        confidence = 70;
    } else if (totalMatches === 1) {
        status = 'flagged';
        confidence = 50;
    }

    return {
        status,
        extractedData,
        matchedFields,
        confidence,
        ocrRawText: ocrText || '',   // full text — caller decides what to store where
        updatedAt: new Date()
    };
}

/**
 * Upload a buffer to Cloudinary with OCR enabled.
 * Returns a Promise that resolves with the upload result.
 */
function uploadToCloudinaryWithOcr(fileBuffer) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'qmetric_id_photos',
                ocr: 'adv_ocr',
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'limit' }]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
}


// ============================================================
// LOGIN CONTROLLER (unchanged)
// ============================================================
const login = async (req, res) => {
    const { email, password, turnstileToken } = req.body;
    console.log(" Login request received for email:", email);

    // --- Cloudflare Turnstile verification ---
    if (!turnstileToken) {
        return res.status(400).json({ error: true, message: "CAPTCHA token is missing. Please complete the verification." });
    }

    const turnstileResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret:   process.env.TURNSTILE_SECRET_KEY,
                response: turnstileToken,
            }).toString(),
        }
    );
    const turnstileResult = await turnstileResponse.json();
    console.log(' Turnstile verification result (login):', turnstileResult);

    if (!turnstileResult.success) {
        return res.status(403).json({
            error:   true,
            message: 'CAPTCHA verification failed. Please refresh the page and try again.',
            codes:   turnstileResult['error-codes'],
        });
    }
    // ------------------------------------------

    // Check if both email and password are provided
    if (!email || !password) {
        console.log(" Missing email or password");
        return res.status(400).json({
            error: true,
            message: "Credentials required.",
        });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({
            error: true,
            message: "Invalid email or password.",
        });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({
            error: true,
            message: "Invalid email or password.",
        });
    }

    try {
        // Generate JWT Token
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "72h" }
        );

        return res.json({
            error: false,
            message: "Login successful",
            user: { userName: user.userName, email: user.email, role: user.role || 'teacher' },
            accessToken,
        });
    } catch (error) {
        console.log(" Token creation error:", error.message);
        return res.status(500).json({ error: true, message: "Error creating token" });
    }
};


// ============================================================
// REGISTER CONTROLLER (with OCR verification)
// ============================================================
const register = async (req, res) => {
    try {
        const { userName, email, password, fullName, phone, collegeName, position, employeeId, department, stream, turnstileToken } = req.body;
        console.log(" Register request received for email:", email);
        const file = req.file; // Provided by multer (memoryStorage → file.buffer)

        // --- Cloudflare Turnstile verification (BEFORE any DB work) ---
        if (!turnstileToken) {
            return res.status(400).json({ error: true, message: "CAPTCHA token is missing. Please complete the verification." });
        }

        const turnstileResponse = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    secret:   process.env.TURNSTILE_SECRET_KEY,
                    response: turnstileToken,
                }).toString(),
            }
        );
        const turnstileResult = await turnstileResponse.json();
        console.log(' Turnstile verification result:', turnstileResult);

        if (!turnstileResult.success) {
            return res.status(403).json({
                error:   true,
                message: 'CAPTCHA verification failed. Please refresh the page and try again.',
                codes:   turnstileResult['error-codes'],
            });
        }
        // ---------------------------------------------------------------

        // --- Step 1: Validate all incoming fields ---
        if (!userName || !email || !password || !fullName || !phone || !collegeName || !position || !employeeId || !department || !stream) {
            return res.status(400).json({ error: true, message: "All fields are required." });
        }

        if (!file) {
            return res.status(400).json({ error: true, message: "College ID photo is required." });
        }

        // Phone format validation (Indian 10-digit)
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ error: true, message: "Phone number must be exactly 10 digits." });
        }

        // Email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: true, message: "Invalid email format." });
        }

        // Check for existing user by email, phone, or employeeId
        const existingUser = await User.findOne({ $or: [{ email }, { phone }, { employeeId }] });
        if (existingUser) {
            let conflictField = "User";
            if (existingUser.email === email.toLowerCase()) conflictField = "Email";
            else if (existingUser.phone === phone) conflictField = "Phone number";
            else if (existingUser.employeeId === employeeId) conflictField = "Employee ID";
            return res.status(409).json({ error: true, message: `${conflictField} already exists in the system.` });
        }

        // --- Step 2 & 3 & 4: Upload image and perform OCR Verification ---
        let uploadResult = null;
        let ocrRawText = '';          // full OCR text — goes to OCRLog, NOT to User
        let idVerification = {
            status: 'unverified',
            extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
            matchedFields: [],
            confidence: 0,
            updatedAt: new Date()
        };

        try {
            // Upload to Cloudinary
            uploadResult = await uploadToCloudinaryWithOcr(file.buffer);
            console.log(' Cloudinary upload successful:', uploadResult.secure_url);

            // Extract OCR Text
            const ocrText = extractOcrText(uploadResult);
            console.log(' OCR raw text:', ocrText ? ocrText.substring(0, 200) + '...' : '(empty)');

            if (ocrText && ocrText.trim().length > 0) {
                // Compare extracted values and determine status
                const verificationResult = runOcrVerification(ocrText, { fullName, employeeId, collegeName, department });

                // Separate the raw text (goes to OCRLog) from the summary (goes to User)
                ocrRawText = verificationResult.ocrRawText;

                // Build User-safe idVerification (no ocrRawText)
                idVerification = {
                    status:        verificationResult.status,
                    extractedData: verificationResult.extractedData,
                    matchedFields: verificationResult.matchedFields,
                    confidence:    verificationResult.confidence,
                    updatedAt:     verificationResult.updatedAt
                };

                console.log(' OCR verification result:', {
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    matchedFields: idVerification.matchedFields,
                    extractedData: idVerification.extractedData
                });
            } else {
                console.log(' No text detected by OCR — marking as unverified');
            }
        } catch (err) {
            // On ANY error (upload or OCR), default to unverified but do NOT block registration
            console.error(' Cloudinary/OCR processing error (non-blocking):', err.message);
        }

        // --- Step 8: Hash password and create user document ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            userName,
            email,
            password: hashedPassword,
            fullName,
            phone,
            collegeName,
            position,
            employeeId,
            department,
            stream,
            collegeIdPhoto: uploadResult ? uploadResult.secure_url : '', // empty string if upload failed
            idVerification
        });

        await newUser.save();
        console.log(' User created:', email, '| Verification:', idVerification.status);

        // --- Save OCR Log (non-blocking) ---
        // Full ocrRawText lives here; failure must NOT affect registration.
        try {
            await OCRLog.create({
                userId:        newUser._id,
                userInput:     { fullName, employeeId, collegeName, department },
                extractedData: idVerification.extractedData,
                matchedFields: idVerification.matchedFields,
                status:        idVerification.status,
                confidence:    idVerification.confidence,
                ocrRawText,
                imageUrl:      uploadResult ? uploadResult.secure_url : ''
            });
            console.log(' OCR log saved for user:', newUser._id);
        } catch (logErr) {
            // Log the error but do NOT fail the registration
            console.error(' OCR log save failed (non-blocking):', logErr.message);
        }

        // --- Step 9: Generate JWT Token ---
        const accessToken = jwt.sign(
            { userId: newUser._id, role: 'teacher' },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "72h" }
        );

        return res.status(201).json({
            error: false,
            message: "Account created successfully.",
            user: {
                userName: newUser.userName,
                email: newUser.email,
                fullName: newUser.fullName,
                idVerification: {
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    matchedFields: idVerification.matchedFields
                }
            },
            accessToken,
        });
    } catch (error) {
        console.error(" Registration error:", error);
        return res.status(500).json({
            error: true,
            message: "Error creating account.",
            details: error.message
        });
    }
};

// ============================================================
// BULK REGISTER CONTROLLER  (CSV Onboarding endpoint)
// POST /auth/bulk-register
//
// Accepts: JSON body  { users: [ { userName, email, password,
//            fullName, phone, collegeName, position,
//            employeeId, department, stream }, ... ] }
//
// Rules:
//  • No file upload — collegeIdPhoto defaults to '' and
//    idVerification defaults to 'unverified' for every row.
//  • Each row is validated independently; invalid/duplicate
//    rows are skipped and reported, not rolled back.
//  • Passwords MUST be supplied per-row OR a shared default
//    password can be provided as `defaultPassword` in the body.
// ============================================================
const bulkRegister = async (req, res) => {
    console.log(' Bulk register request received');

    const { users, defaultPassword, turnstileToken } = req.body;

    // --- Cloudflare Turnstile verification (BEFORE any DB work) ---
    if (!turnstileToken) {
        return res.status(400).json({ error: true, message: 'CAPTCHA token is missing. Please complete the verification.' });
    }

    const turnstileResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret:   process.env.TURNSTILE_SECRET_KEY,
                response: turnstileToken,
            }).toString(),
        }
    );
    const turnstileResult = await turnstileResponse.json();
    console.log(' Turnstile verification result (bulk):', turnstileResult);

    if (!turnstileResult.success) {
        return res.status(403).json({
            error:   true,
            message: 'CAPTCHA verification failed. Please refresh the page and try again.',
            codes:   turnstileResult['error-codes'],
        });
    }
    // ---------------------------------------------------------------

    // ── Basic shape check ────────────────────────────────────
    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({
            error: true,
            message: '`users` must be a non-empty array.'
        });
    }

    if (users.length > 500) {
        return res.status(400).json({
            error: true,
            message: 'Bulk limit is 500 users per request.'
        });
    }

    // ── Required fields for every row ────────────────────────
    const REQUIRED = [
        'userName', 'email', 'fullName', 'phone',
        'collegeName', 'position', 'employeeId', 'department', 'stream'
    ];

    // Valid enum values (mirrors Mongoose schema)
    const VALID_POSITIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HoD', 'Other'];
    const VALID_STREAMS   = ['Engineering', 'Management', 'Science', 'Commerce', 'Arts', 'Law', 'Medicine', 'Other'];

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_RE = /^[0-9]{10}$/;

    // ── Per-row validation pass ───────────────────────────────
    const validRows    = [];   // { index, data, password }
    const skippedRows  = [];   // { index, row, reason }

    for (let i = 0; i < users.length; i++) {
        const row = users[i];

        // 1. Missing required fields
        const missing = REQUIRED.filter((f) => !row[f] || String(row[f]).trim() === '');
        if (missing.length > 0) {
            skippedRows.push({ index: i, row, reason: `Missing fields: ${missing.join(', ')}` });
            continue;
        }

        // 2. Email format
        if (!EMAIL_RE.test(row.email.trim())) {
            skippedRows.push({ index: i, row, reason: 'Invalid email format.' });
            continue;
        }

        // 3. Phone format
        if (!PHONE_RE.test(String(row.phone).trim())) {
            skippedRows.push({ index: i, row, reason: 'Phone must be exactly 10 digits.' });
            continue;
        }

        // 4. Enum validation — position
        if (!VALID_POSITIONS.includes(row.position)) {
            skippedRows.push({ index: i, row, reason: `Invalid position "${row.position}". Allowed: ${VALID_POSITIONS.join(', ')}.` });
            continue;
        }

        // 5. Enum validation — stream
        if (!VALID_STREAMS.includes(row.stream)) {
            skippedRows.push({ index: i, row, reason: `Invalid stream "${row.stream}". Allowed: ${VALID_STREAMS.join(', ')}.` });
            continue;
        }

        // 6. Resolve password (row-level takes priority over shared default)
        const rawPassword = row.password || defaultPassword;
        if (!rawPassword || String(rawPassword).trim().length < 6) {
            skippedRows.push({ index: i, row, reason: 'Password missing or too short (min 6 chars). Provide row-level `password` or a `defaultPassword` in the request body.' });
            continue;
        }

        validRows.push({ index: i, data: row, password: rawPassword.trim() });
    }

    // ── Duplicate-check against DB ────────────────────────────
    // Pull all emails, phones, employeeIds from valid rows in one query.
    const emails      = validRows.map((r) => r.data.email.toLowerCase().trim());
    const phones      = validRows.map((r) => String(r.data.phone).trim());
    const employeeIds = validRows.map((r) => String(r.data.employeeId).trim());

    let existingUsers = [];
    try {
        existingUsers = await User.find({
            $or: [
                { email:      { $in: emails      } },
                { phone:      { $in: phones      } },
                { employeeId: { $in: employeeIds } }
            ]
        }).select('email phone employeeId').lean();
    } catch (dbErr) {
        console.error(' DB duplicate-check error:', dbErr.message);
        return res.status(500).json({ error: true, message: 'Database error during duplicate check.' });
    }

    // Build fast lookup sets
    const existingEmails      = new Set(existingUsers.map((u) => u.email));
    const existingPhones      = new Set(existingUsers.map((u) => u.phone));
    const existingEmployeeIds = new Set(existingUsers.map((u) => u.employeeId));

    const toInsert   = [];   // bcrypt-hashed User documents ready for DB
    const duplicates = [];   // { index, row, reason }

    for (const { index, data, password } of validRows) {
        const emailLower = data.email.toLowerCase().trim();
        const phoneStr   = String(data.phone).trim();
        const empIdStr   = String(data.employeeId).trim();

        // Also check for in-batch duplicates (same email in two CSV rows)
        const isDupEmail  = existingEmails.has(emailLower);
        const isDupPhone  = existingPhones.has(phoneStr);
        const isDupEmpId  = existingEmployeeIds.has(empIdStr);

        if (isDupEmail || isDupPhone || isDupEmpId) {
            const field = isDupEmail ? 'email' : isDupPhone ? 'phone' : 'employeeId';
            duplicates.push({ index, row: data, reason: `${field} already exists in the database.` });
            continue;
        }

        // Hash password
        let hashedPassword;
        try {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        } catch (hashErr) {
            duplicates.push({ index, row: data, reason: `Password hashing failed: ${hashErr.message}` });
            continue;
        }

        toInsert.push({
            userName:     data.userName.trim(),
            email:        emailLower,
            password:     hashedPassword,
            fullName:     data.fullName.trim(),
            phone:        phoneStr,
            collegeName:  data.collegeName.trim(),
            position:     data.position,
            employeeId:   empIdStr,
            department:   data.department.trim(),
            stream:       data.stream,
            collegeIdPhoto: '',          // No file upload in bulk flow
            idVerification: {            // Default — unverified until manual OCR review
                status: 'unverified',
                extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
                matchedFields: [],
                confidence: 0,
                updatedAt: new Date()
            }
        });

        // Register the newly queued identifiers so in-batch duplicates are caught
        existingEmails.add(emailLower);
        existingPhones.add(phoneStr);
        existingEmployeeIds.add(empIdStr);
    }

    // ── Bulk insert ───────────────────────────────────────────
    let inserted = [];
    let dbErrors = [];

    if (toInsert.length > 0) {
        try {
            // ordered:false  → continue inserting remaining docs even if one fails
            const result = await User.insertMany(toInsert, { ordered: false });
            inserted = result;
            console.log(` Bulk insert: ${result.length} users created.`);
        } catch (bulkErr) {
            // insertMany with ordered:false throws a BulkWriteError but still
            // commits the successful documents. Extract them.
            if (bulkErr.insertedDocs) {
                inserted = bulkErr.insertedDocs;
            }
            // Collect any write errors
            const writeErrors = bulkErr.writeErrors || [];
            for (const we of writeErrors) {
                const failedDoc = toInsert[we.index];
                dbErrors.push({
                    row: failedDoc,
                    reason: `DB write error: ${we.errmsg || we.err?.errmsg || 'unknown'}`
                });
            }
            console.error(' Bulk write partial error:', bulkErr.message);
        }
    }

    // ── Build response summary ────────────────────────────────
    const totalReceived = users.length;
    const totalCreated  = inserted.length;
    const totalSkipped  = skippedRows.length + duplicates.length + dbErrors.length;

    const createdUsers = inserted.map((u) => ({
        _id:        u._id,
        userName:   u.userName,
        email:      u.email,
        fullName:   u.fullName,
        employeeId: u.employeeId
    }));

    console.log(` Bulk register complete — created: ${totalCreated}, skipped: ${totalSkipped}`);

    return res.status(207).json({   // 207 Multi-Status: partial success is normal
        error: false,
        summary: {
            totalReceived,
            totalCreated,
            totalSkipped,
        },
        created:  createdUsers,
        failed: [
            ...skippedRows.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
            ...duplicates.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
            ...dbErrors.map(({ row, reason }) => ({ email: row?.email, reason })),
        ]
    });
};

// ============================================================
// CREATE ADMIN CONTROLLER
// POST /auth/create-admin  (protected by X-Admin-Secret header)
//
// Creates a minimal admin account — no OCR, no college ID photo,
// no teacher-specific fields. Just name, email, password.
// ============================================================
const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: true, message: 'Name, email, and password are required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email format.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: true, message: 'Admin password must be at least 8 characters.' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: true, message: 'Email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = new User({
            userName: name.trim(),
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'admin',
            // Teacher-specific fields left as defaults (empty strings / null)
            // idVerification defaults to 'unverified' but is not applicable for admins
            idVerification: { status: 'not_applicable' }
        });

        await admin.save();

        const adminResponse = admin.toObject();
        delete adminResponse.password;

        console.log(` Admin account created: ${email}`);

        return res.status(201).json({
            error: false,
            message: 'Admin account created successfully.',
            user: adminResponse
        });
    } catch (err) {
        console.error(' Create admin error:', err.message);
        return res.status(500).json({ error: true, message: 'Error creating admin account.', details: err.message });
    }
};

module.exports = {
    login,
    register,
    bulkRegister,
    createAdmin
};
