const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../Model/user');
const { logAudit } = require('../utils/auditLog');
const { getUserId } = require('../utils/currentUser');
const College = require('../Model/College');
const OCRLog = require('../Model/OCRLog');
const cloudinary = require('../config/cloudinary');
const { withTransaction } = require('../utils/withTransaction');
const { BCRYPT_ROUNDS, isStrongPassword, PASSWORD_ERROR_MESSAGE } = require('../config/security');
const { createNotification } = require('./notificationController');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const emailService = require('../utils/emailService');
const { revoke } = require('../utils/tokenBlacklist');

// Pre-computed hash used to equalise login timing for unknown emails.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

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
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, ' ');
}

/**
 * Escape regex metacharacters in a string. Uses String.raw for the
 * replacement so no escaped-backslash literal appears in source.
 */
function escapeRegexLiteral(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Build a regex-source string from a label, converting internal spaces
 * to flexible horizontal-whitespace matches. E.g. "employee name"
 * becomes "employee[ \t]+name".
 */
function labelWithFlexibleWhitespace(label) {
    return label
        .split(/\s+/)
        .filter(Boolean)
        .map(escapeRegexLiteral)
        .join(String.raw`[ \t]+`);
}

/**
 * Given a regex that matches a "label + delimiter" prefix, return the text
 * that follows the match on the same line. This replaces greedy `(.+)`
 * capture groups (which trigger S8786).
 */
function textAfterMatch(text, pattern) {
    const match = text.match(pattern);
    if (!match) return '';
    const after = text.slice(match.index + match[0].length);
    return after.split('\n')[0].trim();
}

/**
 * Extract the full OCR text block from the Cloudinary response.
 */
function extractOcrText(uploadResult) {
    try {
        const ocrData = uploadResult.info?.ocr?.adv_ocr?.data;
        if (!Array.isArray(ocrData) || ocrData.length === 0) return '';
        const textAnnotations = ocrData[0]?.textAnnotations;
        if (!Array.isArray(textAnnotations) || textAnnotations.length === 0) return '';
        return textAnnotations[0]?.description || '';
    } catch (err) {
        console.error('  OCR text extraction error:', err.message);
        return '';
    }
}

const NAME_LABELS = [
    'employee name', 'staff name', 'name of employee', 'name of staff',
    'faculty name', 'teacher name', 'name',
];

// Trailing cleanup — matches a label keyword + delimiter at the end
// of an extracted string. Uses [ \t] instead of \s to keep the pattern linear.
const TRAILING_LABEL_RE = /\b(?:dept|department|id|emp|employee|designation|branch|college|university)[ \t]*[:\-–].*$/i;

/**
 * Extract Full Name from OCR text.
 */
function extractFullName(ocrText) {
    const text = String(ocrText);
    for (const label of NAME_LABELS) {
        const source = labelWithFlexibleWhitespace(label) + String.raw`[ \t]*[:\-–][ \t]*`;
        const re = new RegExp(source, 'i');
        const value = textAfterMatch(text, re);
        if (value) {
            return value.replace(TRAILING_LABEL_RE, '').trim();
        }
    }
    return '';
}

const EMPLOYEE_ID_LABELS = [
    'employee id', 'employee no', 'employee code', 'employee number',
    'emp id', 'emp no', 'emp code',
    'staff id', 'staff no', 'staff code',
    'registration id', 'registration no',
    'id no', 'id number', 'roll no', 'faculty id',
];

/**
 * Extract Employee ID from OCR text.
 * The capture uses a bounded character class — no backtracking risk.
 */
function extractEmployeeId(ocrText) {
    const text = String(ocrText);
    for (const label of EMPLOYEE_ID_LABELS) {
        const source = labelWithFlexibleWhitespace(label)
            + String.raw`[ \t]*[:\-–][ \t]*([A-Z0-9\-/]+)`;
        const re = new RegExp(source, 'i');
        const match = text.match(re);
        if (match?.[1]) return match[1].trim();
    }
    return '';
}

/**
 * Extract College Name from OCR text.
 * Uses slice-based extraction to avoid `(.+)` greedy capture.
 */
function extractCollegeName(ocrText) {
    const text = String(ocrText);
    const source = String.raw`(?:college|university|institute|institution)(?:[ \t]+name)?[ \t]*[:\-–][ \t]*`;
    const value = textAfterMatch(text, new RegExp(source, 'i'));
    if (value) return value;

    // Fallback: any line containing institution keywords
    const lines = text.split('\n');
    for (const line of lines) {
        if (/\b(?:college|university|institute|institution)\b/i.test(line) && line.trim().length > 5) {
            return line.trim();
        }
    }
    return '';
}

/**
 * Extract Department from OCR text.
 */
function extractDepartment(ocrText) {
    const source = String.raw`(?:dept|department|branch|faculty[ \t]+of|division)[ \t]*[:\-–][ \t]*`;
    return textAfterMatch(String(ocrText), new RegExp(source, 'i'));
}

/**
 * Compare two strings with fuzzy matching.
 */
function fuzzyMatch(inputValue, extractedValue) {
    if (!inputValue || !extractedValue) return false;
    const a = normalize(inputValue);
    const b = normalize(extractedValue);
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a);
}

/**
 * Exact token match for identifiers (Employee ID).
 */
function exactTokenMatch(userValue, text) {
    if (!userValue || !text) return false;
    const normalizedUser = normalize(userValue);
    if (!normalizedUser) return false;
    const tokens = normalize(text).split(/[\s/,|;:]+/).filter(Boolean);
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

    for(const field of fieldsToCheck) {
        const extracted = extractedData[field];
        const userValue = userInputs[field];
        const isIdField = (field === 'employeeId');

        let isMatch = false;

        if (extracted && userValue) {
            const strictMatch = isIdField
                ? normalize(userValue) === normalize(extracted)
                : fuzzyMatch(userValue, extracted);
            if (strictMatch) {
                isMatch = true;
                strictMatchCount++;
            }
        }

        if (!isMatch && userValue) {
            let fallbackHit;
            if (isIdField) {
                fallbackHit = exactTokenMatch(userValue, ocrText);
            } else {
                const normalizedUserValue = normalize(userValue);
                fallbackHit = normalizedUserValue && normalizedOcrText.includes(normalizedUserValue);
            }

            if (fallbackHit) {
                isMatch = true;
                fallbackMatchCount++;
                extractedData[field] = userValue;
            } else if (!extracted) {
                extractedData[field] = '';
            }
        }

        if (isMatch) matchedFields.push(field);
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
        ocrRawText: ocrText || '',
        updatedAt: new Date(),
    };
}

/**
 * Upload a buffer to Cloudinary with OCR enabled.
 */
function uploadToCloudinaryWithOcr(fileBuffer) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'qmetric_id_photos',
                ocr: 'adv_ocr',
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'limit' }],
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
}

/**
 * Verify a Cloudflare Turnstile token. Returns true if valid.
 */
async function verifyTurnstile(turnstileToken) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    secret: process.env.TURNSTILE_SECRET_KEY,
                    response: turnstileToken,
                }).toString(),
                signal: controller.signal,
            }
        );

        if (!response.ok) {
            throw new Error(`Turnstile returned HTTP ${response.status}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

// ============================================================
// LOGIN CONTROLLER
// ============================================================
const login = async (req, res) => {
    const { email, password, turnstileToken } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: true, message: 'Credentials required.' });
    }

    if (typeof password !== 'string') {
        return res.status(400).json({ error: true, message: 'Invalid email or password.' });
    }

    if (!turnstileToken) {
        return res.status(400).json({ error: true, message: 'CAPTCHA token is missing. Please complete the verification.' });
    }

    let turnstileResult;
    try {
        turnstileResult = await verifyTurnstile(turnstileToken);
    } catch (turnstileErr) {
        console.error('Turnstile verification failed:', turnstileErr.message);
        return res.status(503).json({
            error: true,
            message: 'CAPTCHA service is temporarily unavailable. Please try again later.',
        });
    }

    if (!turnstileResult.success) {
        return res.status(403).json({
            error: true,
            message: 'CAPTCHA verification failed. Please refresh the page and try again.',
            codes: turnstileResult['error-codes'],
        });
    }

    const user = await User.findOne({ email });

    // Always run a bcrypt compare (against a dummy hash when the user doesn't
    // exist) so response time doesn't reveal whether the email is registered.
    const isPasswordValid = await bcrypt.compare(
        password,
        user ? user.password : DUMMY_PASSWORD_HASH
    );

    if (!user) {
        return res.status(401).json({ error: true, message: 'Invalid email or password.' });
    }

    // Blocked status is only revealed to someone who knows the password.
    if (isPasswordValid && user.isBlocked) {
        await logAudit({
            userId: user._id,
            action: 'LOGIN_BLOCKED',
            resource: `User:${user._id}`,
            request: req,
            error: new Error('Blocked user attempted to login'),
        });
        return res.status(403).json({
            error: true,
            message: 'Your account has been blocked. Please contact your administrator.',
        });
    }

    if (!isPasswordValid) {
        await logAudit({
            userId: user._id,
            action: 'LOGIN',
            resource: `User:${user._id}`,
            request: req,
            error: new Error('Invalid credentials'),
        });
        return res.status(401).json({ error: true, message: 'Invalid email or password.' });
    }

    try {
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        });

        // Issue refresh token (7 days)
        const rawRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        user.refreshTokenHash = refreshHash;
        user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        res.cookie('refreshToken', rawRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/auth',
        });

        const accountState = user.collegeApprovalStatus === 'pending'
            ? 'pending_approval'
            : 'active';

        await logAudit({
            userId: user._id,
            action: 'LOGIN',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: accountState === 'pending_approval'
                ? 'Login successful. Your account is awaiting approval from your college admin.'
                : 'Login successful',
            user: {
                _id: user._id,
                userName: user.userName,
                email: user.email,
                fullName: user.fullName || user.userName,
                role: user.role || 'teacher',
                collegeId: user.collegeId || null,
                collegeName: user.collegeName || '',
                collegeApprovalStatus: user.collegeApprovalStatus || 'not_applicable',
            },
            accountState,
            canUseFeatures: accountState === 'active',
        });
    } catch (error) {
        console.error('Token creation error:', error.message);
        return res.status(500).json({ error: true, message: 'Error creating token' });
    }
};

// ============================================================
// REGISTER CONTROLLER — 3 flows (affiliated / independent / student)
// ============================================================
const register = async (req, res) => {
    try {
        const {
            userName, email, password, fullName, phone,
            collegeId, collegeCode, collegeName,
            position, employeeId, department, stream,
            turnstileToken,
            role = 'teacher',
            signupIntent,
        } = req.body || {};

        // ── Turnstile gate ──────────────────────────────
        if (!turnstileToken) {
            return res.status(400).json({ error: true, message: 'CAPTCHA token is missing. Please complete the verification.' });
        }
        let turnstileResult;
        try {
            turnstileResult = await verifyTurnstile(turnstileToken);
        } catch (turnstileErr) {
            console.error('Turnstile verification failed:', turnstileErr.message);
            return res.status(503).json({
                error: true,
                message: 'CAPTCHA service is temporarily unavailable. Please try again later.',
            });
        }
        if (!turnstileResult.success) {
            return res.status(403).json({
                error: true,
                message: 'CAPTCHA verification failed. Please refresh the page and try again.',
                codes: turnstileResult['error-codes'],
            });
        }

        // ── Base validation ─────────────────────────────
        if (!['teacher', 'student'].includes(role)) {
            return res.status(400).json({ error: true, message: 'Invalid role for signup.' });
        }
        if (role === 'teacher' && !['affiliated', 'independent'].includes(signupIntent)) {
            return res.status(400).json({
                error: true,
                message: 'signupIntent must be "affiliated" or "independent" for teachers.',
            });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
        }
        if (typeof email !== 'string' || email.length > 254 || !validator.isEmail(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email format.' });
        }
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: true, message: 'Phone number must be exactly 10 digits.' });
        }

        // ── Uniqueness ──────────────────────────────────
        const emailLower = email.toLowerCase().trim();
        const uniqueness = [{ email: emailLower }, { phone }];
        if (employeeId) uniqueness.push({ employeeId });

        const existingUser = await User.findOne({ $or: uniqueness });
        if (existingUser) {
            let conflictField = 'User';
            if (existingUser.email === emailLower) conflictField = 'Email';
            else if (existingUser.phone === phone) conflictField = 'Phone number';
            else if (employeeId && existingUser.employeeId === employeeId) conflictField = 'Employee ID';
            return res.status(409).json({ error: true, message: `${conflictField} already exists in the system.` });
        }

        // ═══════════════ FLOW A: Affiliated teacher ═══════════════
        if (role === 'teacher' && signupIntent === 'affiliated') {
            // Resolve college
            let matchedCollege = null;
            if (collegeId) {
                matchedCollege = await College.findById(collegeId);
            } else if (collegeCode) {
                matchedCollege = await College.findOne({ code: collegeCode.trim().toUpperCase() });
            } else if (collegeName) {
                // Escape user input — never interpolate raw strings into $regex.
                matchedCollege = await College.findOne({ name: { $regex: `^${escapeRegexLiteral(String(collegeName).trim())}$`, $options: 'i' } });
            }
            if (!matchedCollege) {
                return res.status(400).json({
                    error: true,
                    message: 'Selected college is not recognized. Please choose a valid registered college.',
                });
            }
            if (!matchedCollege.isActive) {
                return res.status(403).json({
                    error: true,
                    message: 'This college is currently inactive. Please contact the college administrator.',
                });
            }
            if (!position) {
                return res.status(400).json({ error: true, message: 'Position is required for affiliated teachers.' });
            }

            // OCR (best-effort)
            let uploadResult = null;
            let ocrRawText = '';
            let idVerification = {
                status: 'unverified',
                extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
                matchedFields: [],
                confidence: 0,
                updatedAt: new Date(),
            };

            if (req.file) {
                try {
                    uploadResult = await uploadToCloudinaryWithOcr(req.file.buffer);
                    const ocrText = extractOcrText(uploadResult);
                    if (ocrText && ocrText.trim().length > 0) {
                        const verificationResult = runOcrVerification(ocrText, {
                            fullName,
                            employeeId,
                            collegeName: matchedCollege.name,
                            department,
                        });
                        ocrRawText = verificationResult.ocrRawText;
                        idVerification = {
                            status: verificationResult.status,
                            extractedData: verificationResult.extractedData,
                            matchedFields: verificationResult.matchedFields,
                            confidence: verificationResult.confidence,
                            updatedAt: verificationResult.updatedAt,
                        };
                    }
                } catch (ocrErr) {
                    console.error('Cloudinary/OCR processing error (non-blocking):', ocrErr.message);
                }
            }

            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            let newUser;

            await withTransaction(async (session) => {
                const opts = session ? { session } : {};
                const [created] = await User.create([{
                    userName,
                    email: emailLower,
                    password: hashedPassword,
                    fullName,
                    phone,
                    role: 'teacher',
                    collegeId: matchedCollege._id,
                    collegeName: matchedCollege.name,
                    position,
                    employeeId,
                    department,
                    stream,
                    collegeIdPhoto: uploadResult ? uploadResult.secure_url : '',
                    collegeIdPhotoPublicId: uploadResult ? uploadResult.public_id : null,
                    idVerification,
                    collegeApprovalStatus: 'pending',
                }], opts);
                newUser = created;
            });

            // Audit
            try {
                await logAudit({
                    userId: newUser._id,
                    action: 'REGISTER_TEACHER_AFFILIATED',
                    resource: `User:${newUser._id}`,
                    request: req,
                });
            } catch (auditErr) {
                console.error('Audit log failed (non-blocking):', auditErr.message);
            }

            // OCRLog record
            try {
                await OCRLog.create({
                    userId: newUser._id,
                    userInput: { fullName, employeeId, collegeName: matchedCollege.name, department },
                    extractedData: idVerification.extractedData,
                    matchedFields: idVerification.matchedFields,
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    ocrRawText,
                    imageUrl: uploadResult ? uploadResult.secure_url : '',
                });
            } catch (logErr) {
                console.error('OCR log save failed (non-blocking):', logErr.message);
            }

            // Notify all college admins
            try {
                const admins = await User.find({
                    collegeId: matchedCollege._id,
                    role: 'admin',
                }).select('_id').lean();

                for (const admin of admins) {
                    createNotification({
                        userId: admin._id,
                        type: 'pending_teacher_approval',
                        title: 'New teacher awaiting approval',
                        message: `${fullName} (${emailLower}) from ${matchedCollege.name} is awaiting approval.`,
                        relatedDocId: newUser._id,
                        actionUrl: `/college-admin/pending-teachers/${newUser._id}`,
                    }).catch(() => {});
                }
            } catch (notifErr) {
                console.error('Admin notification dispatch failed (non-blocking):', notifErr.message);
            }

            // Welcome notification for the user
            createNotification({
                userId: newUser._id,
                type: 'welcome_pending_approval',
                title: 'Welcome to QMetric',
                message: `Your affiliation with ${matchedCollege.name} is awaiting admin approval.`,
                actionUrl: '/profile',
            }).catch(() => {});

            // Welcome email (fire-and-forget)
            emailService
                .sendWelcomeAffiliatedTeacherEmail(newUser.email, newUser.fullName, matchedCollege.name)
                .catch(() => {});

            // NO COOKIE — pending approval
            return res.status(201).json({
                error: false,
                message: `Welcome, ${fullName}! Your account is awaiting approval from ${matchedCollege.name}.`,
                requiresApproval: true,
                accountState: 'pending_approval',
                user: {
                    _id: newUser._id,
                    userName: newUser.userName,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: 'teacher',
                    collegeId: matchedCollege._id,
                    collegeName: matchedCollege.name,
                },
            });
        }

        // ═══════════════ FLOW B: Independent teacher ═══════════════
        if (role === 'teacher' && signupIntent === 'independent') {
            if (!position) {
                return res.status(400).json({ error: true, message: 'Position is required.' });
            }

            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const newUser = await User.create({
                userName,
                email: emailLower,
                password: hashedPassword,
                fullName,
                phone,
                role: 'teacher',
                collegeId: null,
                collegeName: '',
                position,
                employeeId: employeeId || undefined,
                department: department || '',
                stream: stream || '',
                idVerification: { status: 'not_applicable', updatedAt: new Date() },
            });

            try {
                await logAudit({
                    userId: newUser._id,
                    action: 'REGISTER_TEACHER_INDEPENDENT',
                    resource: `User:${newUser._id}`,
                    request: req,
                });
            } catch (auditErr) {
                console.error('Audit log failed (non-blocking):', auditErr.message);
            }

            createNotification({
                userId: newUser._id,
                type: 'welcome',
                title: 'Welcome to QMetric',
                message: 'Your independent teacher account is active. Upload a paper to get started.',
                actionUrl: '/student/papers',
            }).catch(() => {});

            const accessToken = jwt.sign(
                { userId: newUser._id, role: 'teacher' },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '72h' }
            );
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 72 * 60 * 60 * 1000,
            });

            return res.status(201).json({
                error: false,
                message: 'Welcome to QMetric!',
                canUseFeatures: true,
                accountState: 'active',
                user: {
                    _id: newUser._id,
                    userName: newUser.userName,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: 'teacher',
                    collegeId: null,
                    collegeName: '',
                },
            });
        }

        // ═══════════════ FLOW C: Student ═══════════════
        if (role === 'student') {
            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            const newUser = await User.create({
                userName,
                email: emailLower,
                password: hashedPassword,
                fullName,
                phone,
                role: 'student',
                collegeId: null,
                collegeName: '',
                position: '',
                department: '',
                stream: '',
                idVerification: { status: 'not_applicable', updatedAt: new Date() },
            });

            try {
                await logAudit({
                    userId: newUser._id,
                    action: 'REGISTER_STUDENT',
                    resource: `User:${newUser._id}`,
                    request: req,
                });
            } catch (auditErr) {
                console.error('Audit log failed (non-blocking):', auditErr.message);
            }

            createNotification({
                userId: newUser._id,
                type: 'welcome',
                title: 'Welcome to QMetric',
                message: 'Your student account is active. Upload a paper to check its quality.',
                actionUrl: '/student/papers',
            }).catch(() => {});

            const accessToken = jwt.sign(
                { userId: newUser._id, role: 'student' },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '72h' }
            );
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 72 * 60 * 60 * 1000,
            });

            return res.status(201).json({
                error: false,
                message: 'Welcome to QMetric!',
                canUseFeatures: true,
                accountState: 'active',
                user: {
                    _id: newUser._id,
                    userName: newUser.userName,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: 'student',
                    collegeId: null,
                    collegeName: '',
                },
            });
        }

        return res.status(400).json({ error: true, message: 'Unhandled signup flow.' });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            error: true,
            message: 'Error creating account.',
        });
    }
};

// ============================================================
// BULK REGISTER CONTROLLER — helper extraction (S3776)
// ============================================================

const REQUIRED_FIELDS = [
    'userName', 'email', 'fullName', 'phone',
    'collegeName', 'position', 'employeeId', 'department', 'stream',
];

const VALID_POSITIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HoD', 'Other'];
const VALID_STREAMS = ['Engineering', 'Management', 'Science', 'Commerce', 'Arts', 'Law', 'Medicine', 'Other'];
const PHONE_RE = /^\d{10}$/;
const VALID_BULK_ROLES = ['teacher', 'reviewer'];

/**
 * Validate a single bulk row. Returns either
 *   { ok: true, data, password }
 * or
 *   { ok: false, reason }
 */
function validateBulkRow(row, defaultPassword) {
    const missing = REQUIRED_FIELDS.filter((f) => !row[f] || String(row[f]).trim() === '');
    if (missing.length > 0) {
        return { ok: false, reason: `Missing fields: ${missing.join(', ')}` };
    }

    const trimmedEmail = String(row.email).trim();
    if (trimmedEmail.length > 254 || !validator.isEmail(trimmedEmail)) {
        return { ok: false, reason: 'Invalid email format.' };
    }

    if (!PHONE_RE.test(String(row.phone).trim())) {
        return { ok: false, reason: 'Phone must be exactly 10 digits.' };
    }

    if (!VALID_POSITIONS.includes(row.position)) {
        return { ok: false, reason: `Invalid position "${row.position}". Allowed: ${VALID_POSITIONS.join(', ')}.` };
    }

    if (!VALID_STREAMS.includes(row.stream)) {
        return { ok: false, reason: `Invalid stream "${row.stream}". Allowed: ${VALID_STREAMS.join(', ')}.` };
    }

    if (row.role && !VALID_BULK_ROLES.includes(String(row.role).trim())) {
        return { ok: false, reason: `Invalid role "${row.role}". Allowed: ${VALID_BULK_ROLES.join(', ')}.` };
    }

    const rawPassword = row.password || defaultPassword;
    if (!rawPassword || !isStrongPassword(String(rawPassword).trim())) {
        return {
            ok: false,
            reason: `Password does not meet policy. ${PASSWORD_ERROR_MESSAGE} Provide row-level \`password\` or a strong \`defaultPassword\`.`,
        };
    }

    return { ok: true, data: row, password: rawPassword.trim() };
}

/**
 * Build a lookup map from college names, codes, and ids.
 */
function buildCollegeMap(colleges) {
    const map = new Map();
    for (const col of colleges) {
        if (col.name) map.set(col.name.toLowerCase().trim(), col);
        if (col.code) map.set(col.code.toLowerCase().trim(), col);
        map.set(String(col._id), col);
    }
    return map;
}

/**
 * Detect which field triggered a duplicate, without nested ternaries (S3358).
 */
function duplicateFieldName({ email, phone, employeeId }) {
    if (email) return 'email';
    if (phone) return 'phone';
    if (employeeId) return 'employeeId';
    return 'unknown';
}

// ============================================================
// BULK REGISTER CONTROLLER
// ============================================================
const bulkRegister = async (req, res) => {
    const { users, defaultPassword, turnstileToken } = req.body || {};
    // Strict booleans: only the literal `true` enables these flags.
    const dryRun = req.body?.dryRun === true;
    const rollbackOnError = req.body?.rollbackOnError === true;
    const hasAdminSecret = Boolean(req.headers['x-admin-secret']);

    // ── Turnstile gate ─────────────────────────────────
    if (turnstileToken && !hasAdminSecret) {
        let turnstileResult;
        try {
            turnstileResult = await verifyTurnstile(turnstileToken);
        } catch (turnstileErr) {
            console.error('Turnstile verification failed:', turnstileErr.message);
            return res.status(503).json({
                error: true,
                message: 'CAPTCHA service is temporarily unavailable. Please try again later.',
            });
        }
        if (!turnstileResult.success) {
            return res.status(403).json({
                error: true,
                message: 'CAPTCHA verification failed. Please refresh the page and try again.',
                codes: turnstileResult['error-codes'],
            });
        }
    } else if (!hasAdminSecret && !turnstileToken) {
        return res.status(400).json({ error: true, message: 'CAPTCHA token is missing. Please complete the verification.' });
    }

    // ── Shape check ────────────────────────────────────
    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ error: true, message: '`users` must be a non-empty array.' });
    }
    if (users.length > 500) {
        return res.status(400).json({ error: true, message: 'Bulk limit is 500 users per request.' });
    }

    // ── Validate rows (per-row) ────────────────────────
    const validRows = [];
    const skippedRows = [];

    for (let i = 0; i < users.length; i++) {
        const result = validateBulkRow(users[i], defaultPassword);
        if (!result.ok) {
            skippedRows.push({ index: i, row: users[i], reason: result.reason });
        } else {
            validRows.push({ index: i, data: result.data, password: result.password });
        }
    }

    // ── Duplicate check against DB ─────────────────────
    const emails = validRows.map((r) => r.data.email.toLowerCase().trim());
    const phones = validRows.map((r) => String(r.data.phone).trim());
    const employeeIds = validRows.map((r) => String(r.data.employeeId).trim());

    let existingUsers = [];
    try {
        existingUsers = await User.find({
            $or: [
                { email: { $in: emails } },
                { phone: { $in: phones } },
                { employeeId: { $in: employeeIds } },
            ],
        }).select('email phone employeeId').lean();
    } catch (dbErr) {
        console.error(' DB duplicate-check error:', dbErr.message);
        return res.status(500).json({ error: true, message: 'Database error during duplicate check.' });
    }

    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const existingPhones = new Set(existingUsers.map((u) => u.phone));
    const existingEmployeeIds = new Set(existingUsers.map((u) => u.employeeId));

    // ── College resolution ─────────────────────────────
    const activeColleges = await College.find({ isActive: true }).lean();
    const collegeMap = buildCollegeMap(activeColleges);

    const toInsert = [];
    const duplicates = [];

    for (const { index, data, password } of validRows) {
        const emailLower = data.email.toLowerCase().trim();
        const phoneStr = String(data.phone).trim();
        const empIdStr = String(data.employeeId).trim();

        const dupFlags = {
            email: existingEmails.has(emailLower),
            phone: existingPhones.has(phoneStr),
            employeeId: existingEmployeeIds.has(empIdStr),
        };

        if (dupFlags.email || dupFlags.phone || dupFlags.employeeId) {
            duplicates.push({
                index,
                row: data,
                reason: `${duplicateFieldName(dupFlags)} already exists in the database.`,
            });
            continue;
        }

        const rawCollegeKey = String(data.collegeId || data.collegeName || '').toLowerCase().trim();
        // No silent fallback: an unrecognised / inactive college is a per-row error.
        const matchedCol = collegeMap.get(rawCollegeKey);

        if (!matchedCol) {
            skippedRows.push({ index, row: data, reason: `College "${data.collegeName || data.collegeId}" not recognized or inactive.` });
            continue;
        }

        let hashedPassword;
        try {
            // Skip the (expensive) bcrypt work on dry runs — nothing is persisted.
            hashedPassword = dryRun ? '' : await bcrypt.hash(password, BCRYPT_ROUNDS);
        } catch (hashErr) {
            duplicates.push({ index, row: data, reason: `Password hashing failed: ${hashErr.message}` });
            continue;
        }

        toInsert.push({
            userName: data.userName.trim(),
            email: emailLower,
            password: hashedPassword,
            fullName: data.fullName.trim(),
            phone: phoneStr,
            collegeId: matchedCol._id,
            collegeName: matchedCol.name,
            position: data.position,
            employeeId: empIdStr,
            department: data.department.trim(),
            stream: data.stream,
            role: String(data.role || 'teacher').trim(),
            collegeIdPhoto: '',
            idVerification: {
                status: 'unverified',
                extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
                matchedFields: [],
                confidence: 0,
                updatedAt: new Date(),
            },
        });

        existingEmails.add(emailLower);
        existingPhones.add(phoneStr);
        existingEmployeeIds.add(empIdStr);
    }

    const failedRows = () => [
        ...skippedRows.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
        ...duplicates.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
    ];

    // ── rollbackOnError: any bad row aborts the whole batch, nothing is written ──
    if (rollbackOnError && skippedRows.length + duplicates.length > 0) {
        return res.status(422).json({
            error: true,
            message: 'One or more rows failed validation. No users were created (rollbackOnError).',
            summary: {
                totalReceived: users.length,
                totalCreated: 0,
                totalSkipped: skippedRows.length + duplicates.length,
                rolledBack: true,
            },
            created: [],
            failed: failedRows(),
        });
    }

    // ── dryRun: report what WOULD happen, write nothing ──
    if (dryRun) {
        return res.status(200).json({
            error: false,
            dryRun: true,
            summary: {
                totalReceived: users.length,
                wouldCreate: toInsert.length,
                totalSkipped: skippedRows.length + duplicates.length,
            },
            failed: failedRows(),
        });
    }

    // ── Atomic bulk insert ─────────────────────────────
    let inserted = [];
    const dbErrors = [];

    if (toInsert.length > 0) {
        try {
            await withTransaction(async (session) => {
                const opts = session ? { session } : {};

                inserted = await User.insertMany(toInsert, { ordered: true, ...opts });

                const incMap = new Map();
                for (const doc of toInsert) {
                    const role = doc.role || 'teacher';
                    if (role !== 'teacher') continue;
                    const key = String(doc.collegeId);
                    incMap.set(key, (incMap.get(key) || 0) + 1);
                }

                for (const [collegeId, count] of incMap.entries()) {
                    await College.findByIdAndUpdate(collegeId, { $inc: { totalTeachers: count } }, opts);
                }
            });
        } catch (bulkErr) {
            dbErrors.push({
                row: null,
                reason: 'Bulk insert failed. No users were created.',
            });
            inserted = [];
            console.error(' Bulk write rolled back:', bulkErr.message);
        }
    }

    // ── Response ───────────────────────────────────────
    const totalReceived = users.length;
    const totalCreated = inserted.length;
    const totalSkipped = skippedRows.length + duplicates.length + dbErrors.length;

    const createdUsers = inserted.map((u) => ({
        _id: u._id,
        userName: u.userName,
        email: u.email,
        fullName: u.fullName,
        employeeId: u.employeeId,
    }));

    // ── Fire summary email to requesting admin (non-blocking) ──
    try {
        const requesterId = getUserId(req) || req.adminId;
        if (requesterId && mongoose.isValidObjectId(requesterId)) {
            const requester = await User.findById(requesterId).select('email fullName').lean();
            if (requester?.email) {
                emailService.sendBulkRegistrationSummary({
                    to: requester.email,
                    adminName: requester.fullName,
                    totalCreated,
                    totalFailed: skippedRows.length + duplicates.length + dbErrors.length,
                    totalSkipped: skippedRows.length,
                    failedList: [
                        ...skippedRows.map(({ row, reason }) => ({ email: row.email, reason })),
                        ...duplicates.map(({ row, reason }) => ({ email: row.email, reason })),
                    ],
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.error(' Bulk summary email failed (non-blocking):', e.message);
    }

    try {
        const auditUserId = getUserId(req) || req.adminId;
        const hasUserActor = mongoose.isValidObjectId(auditUserId);

        await logAudit({
            userId: hasUserActor ? auditUserId : null,
            actorType: hasUserActor ? 'user' : 'admin_secret',
            action: 'BULK_REGISTER',
            resource:
                `BulkRegister:created=${totalCreated}:failed=${skippedRows.length + duplicates.length + dbErrors.length}`,
            request: req,
        });
    } catch (auditErr) {
        console.error(
            'Bulk register audit log failed (non-blocking):',
            auditErr.message
        );
    }

    return res.status(207).json({
        error: false,
        summary: { totalReceived, totalCreated, totalSkipped },
        created: createdUsers,
        failed: [
            ...skippedRows.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
            ...duplicates.map(({ index, row, reason }) => ({ index, email: row.email, reason })),
            ...dbErrors.map(({ row, reason }) => ({ email: row?.email, reason })),
        ],
    });
};

// ============================================================
// CREATE ADMIN CONTROLLER
// ============================================================
const createAdmin = async (req, res) => {
    try {
        const { name, email, password, collegeId } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({ error: true, message: 'Name, email, and password are required.' });
        }
        if (typeof email !== 'string' || email.length > 254 || !validator.isEmail(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email format.' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: true, message: 'Email is already registered.' });
        }

        let effectiveCollegeId = null;
        let effectiveCollegeName = 'N/A';

        if (collegeId) {
            const foundCollege = await College.findOne({ _id: collegeId, isActive: true });
            if (!foundCollege) {
                return res.status(400).json({ error: true, message: 'Invalid or inactive college.' });
            }
            effectiveCollegeId = foundCollege._id;
            effectiveCollegeName = foundCollege.name;
        }
        if (!effectiveCollegeId) {
            const activeColleges = await College.find({ isActive: true })
                .select('_id name')
                .sort({ createdAt: 1 })
                .limit(2)
                .lean();

            if (activeColleges.length > 1) {
                return res.status(400).json({
                    error: true,
                    message: 'collegeId is required when multiple active colleges exist.',
                });
            }

            if (activeColleges.length === 1) {
                effectiveCollegeId = activeColleges[0]._id;
                effectiveCollegeName = activeColleges[0].name;
            }
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const admin = new User({
            userName: name.trim(),
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'admin',
            collegeId: effectiveCollegeId,
            collegeName: effectiveCollegeName,
            idVerification: { status: 'not_applicable' },
        });

        await admin.save();

        createNotification({
          userId: admin._id,
          type: 'welcome',
          title: 'Welcome to QMetric',
          message: 'Your admin account is ready. Explore the dashboard to get started.',
          actionUrl: '/dashboard',
        }).catch(() => {});

        emailService.sendNewUserEmail(admin, password).catch(() => {});
        await logAudit({
            userId: getUserId(req),
            action: 'CREATE_ADMIN',
            resource: `User:${admin._id}`,
            request: req,
        });

        const adminResponse = admin.toObject();
        delete adminResponse.password;

        return res.status(201).json({
            error: false,
            message: 'Admin account created successfully.',
            user: adminResponse,
        });
    } catch (err) {
        console.error(' Create admin error:', err.message);
        return res.status(500).json({ error: true, message: 'Error creating admin account.' });
    }
};

// ============================================================
// EMAIL VERIFICATION
// ============================================================
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: true, message: 'Verification token required.' });
        }

        const hashed = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashed,
            emailVerificationExpires: { $gt: new Date() },
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            return res.status(400).json({ error: true, message: 'Invalid or expired verification token.' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save({ validateBeforeSave: false });

        await logAudit({
            userId: user._id,
            action: 'EMAIL_VERIFIED',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({ error: false, message: 'Email verified successfully.' });
    } catch (err) {
        console.error(' verifyEmail error:', err);
        return res.status(500).json({ error: true, message: 'Server error.' });
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: true, message: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Don't leak whether the account exists
        if (!user) {
            return res.json({ error: false, message: 'If that email exists, a verification link has been sent.' });
        }
        if (user.emailVerified) {
            return res.json({ error: false, message: 'Email is already verified.' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.emailVerificationToken = hashed;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        emailService.sendVerificationEmail(user.email, rawToken, user.fullName).catch(() => {});

        return res.json({ error: false, message: 'If that email exists, a verification link has been sent.' });
    } catch (err) {
        console.error(' resendVerificationEmail error:', err);
        return res.status(500).json({ error: true, message: 'Server error.' });
    }
};

// ============================================================
// POST /auth/profile/request-affiliation
// Independent teacher → requests affiliation with a college (pending approval)
// ============================================================
const requestAffiliation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: true, message: 'Unauthenticated.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }

        if (user.role !== 'teacher') {
            return res.status(400).json({
                error: true,
                message: 'Only teachers can request college affiliation.',
            });
        }

        if (user.collegeId || user.collegeApprovalStatus === 'pending') {
            return res.status(400).json({
                error: true,
                message: user.collegeApprovalStatus === 'pending'
                    ? 'You already have a pending affiliation request.'
                    : 'You are already affiliated with a college.',
            });
        }

        const { collegeId } = req.body || {};
        if (!collegeId) {
            return res.status(400).json({ error: true, message: 'collegeId is required.' });
        }

        const matchedCollege = await College.findById(collegeId);
        if (!matchedCollege) {
            return res.status(400).json({ error: true, message: 'College not found.' });
        }
        if (!matchedCollege.isActive) {
            return res.status(403).json({
                error: true,
                message: 'This college is currently inactive.',
            });
        }

        // OCR (best-effort)
        let uploadResult = null;
        let ocrRawText = '';
        let idVerification = {
            status: 'unverified',
            extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
            matchedFields: [],
            confidence: 0,
            updatedAt: new Date(),
        };

        if (req.file) {
            try {
                uploadResult = await uploadToCloudinaryWithOcr(req.file.buffer);
                const ocrText = extractOcrText(uploadResult);
                if (ocrText && ocrText.trim().length > 0) {
                    const verificationResult = runOcrVerification(ocrText, {
                        fullName: user.fullName,
                        employeeId: user.employeeId,
                        collegeName: matchedCollege.name,
                        department: user.department,
                    });
                    ocrRawText = verificationResult.ocrRawText;
                    idVerification = {
                        status: verificationResult.status,
                        extractedData: verificationResult.extractedData,
                        matchedFields: verificationResult.matchedFields,
                        confidence: verificationResult.confidence,
                        updatedAt: verificationResult.updatedAt,
                    };
                }
            } catch (ocrErr) {
                console.error('OCR processing error (non-blocking):', ocrErr.message);
            }
        }

        // Store the pending request; do NOT touch collegeId yet
        user.pendingAffiliationRequest = {
            collegeId: matchedCollege._id,
            requestedAt: new Date(),
            idVerification,
        };
        user.collegeApprovalStatus = 'pending';
        await user.save();

        // Audit
        try {
            await logAudit({
                userId: user._id,
                action: 'REQUEST_AFFILIATION',
                resource: `User:${user._id}`,
                changes: {
                    newValue: { collegeId: matchedCollege._id, collegeName: matchedCollege.name },
                    fields: ['pendingAffiliationRequest'],
                },
                request: req,
            });
        } catch (auditErr) {
            console.error('Audit log failed (non-blocking):', auditErr.message);
        }

        // OCRLog record (if OCR ran)
        if (uploadResult) {
            try {
                await OCRLog.create({
                    userId: user._id,
                    userInput: {
                        fullName: user.fullName,
                        employeeId: user.employeeId,
                        collegeName: matchedCollege.name,
                        department: user.department,
                    },
                    extractedData: idVerification.extractedData,
                    matchedFields: idVerification.matchedFields,
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    ocrRawText,
                    imageUrl: uploadResult.secure_url,
                });
            } catch (logErr) {
                console.error('OCR log save failed (non-blocking):', logErr.message);
            }
        }

        // Notify college admins
        try {
            const admins = await User.find({
                collegeId: matchedCollege._id,
                role: 'admin',
            }).select('_id').lean();

            for (const admin of admins) {
                createNotification({
                    userId: admin._id,
                    type: 'pending_teacher_approval',
                    title: 'Affiliation request',
                    message: `${user.fullName} (${user.email}) has requested affiliation with ${matchedCollege.name}.`,
                    relatedDocId: user._id,
                    actionUrl: `/college-admin/pending-teachers/${user._id}`,
                }).catch(() => {});
            }
        } catch (notifErr) {
            console.error('Admin notification dispatch failed (non-blocking):', notifErr.message);
        }

        return res.json({
            error: false,
            message: `Your affiliation request with ${matchedCollege.name} has been submitted for approval.`,
            requiresApproval: true,
            accountState: 'pending_approval',
        });
    } catch (err) {
        console.error('requestAffiliation error:', err);
        return res.status(500).json({ error: true, message: 'Server error.' });
    }
};

// ============================================================
// POST /auth/profile/upgrade-to-teacher
// Student → teacher (independent: instant; affiliated: pending)
// ============================================================
const upgradeToTeacher = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: true, message: 'Unauthenticated.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }

        if (user.role !== 'student') {
            return res.status(400).json({
                error: true,
                message: 'Only student accounts can be upgraded to teacher.',
            });
        }

        const { signupIntent, collegeId } = req.body || {};

        if (!['affiliated', 'independent'].includes(signupIntent)) {
            return res.status(400).json({
                error: true,
                message: 'signupIntent must be "affiliated" or "independent".',
            });
        }

        // ── Independent teacher (instant) ────────────────────
        if (signupIntent === 'independent') {
            user.role = 'teacher';
            user.collegeId = null;
            user.collegeName = '';
            user.collegeApprovalStatus = 'approved';
            // Populate teacher-required fields from existing student data
            if (!user.position) user.position = 'Other';
            await user.save();

            try {
                await logAudit({
                    userId: user._id,
                    action: 'UPGRADE_TO_TEACHER',
                    resource: `User:${user._id}`,
                    changes: {
                        oldValue: { role: 'student' },
                        newValue: { role: 'teacher', affiliation: 'independent' },
                        fields: ['role'],
                    },
                    request: req,
                });
            } catch (auditErr) {
                console.error('Audit log failed (non-blocking):', auditErr.message);
            }

            createNotification({
                userId: user._id,
                type: 'welcome',
                title: 'Account upgraded',
                message: 'You are now an independent teacher. Upload papers to get started.',
                actionUrl: '/student/papers',
            }).catch(() => {});

            return res.json({
                error: false,
                message: 'Account upgraded to independent teacher.',
                canUseFeatures: true,
                accountState: 'active',
            });
        }

        // ── Affiliated teacher (pending approval) ────────────
        if (!collegeId) {
            return res.status(400).json({ error: true, message: 'collegeId is required for affiliated upgrade.' });
        }

        const matchedCollege = await College.findById(collegeId);
        if (!matchedCollege) {
            return res.status(400).json({ error: true, message: 'College not found.' });
        }
        if (!matchedCollege.isActive) {
            return res.status(403).json({ error: true, message: 'This college is currently inactive.' });
        }

        // OCR (best-effort)
        let uploadResult = null;
        let ocrRawText = '';
        let idVerification = {
            status: 'unverified',
            extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
            matchedFields: [],
            confidence: 0,
            updatedAt: new Date(),
        };

        if (req.file) {
            try {
                uploadResult = await uploadToCloudinaryWithOcr(req.file.buffer);
                const ocrText = extractOcrText(uploadResult);
                if (ocrText && ocrText.trim().length > 0) {
                    const verificationResult = runOcrVerification(ocrText, {
                        fullName: user.fullName,
                        employeeId: user.employeeId,
                        collegeName: matchedCollege.name,
                        department: user.department,
                    });
                    ocrRawText = verificationResult.ocrRawText;
                    idVerification = {
                        status: verificationResult.status,
                        extractedData: verificationResult.extractedData,
                        matchedFields: verificationResult.matchedFields,
                        confidence: verificationResult.confidence,
                        updatedAt: verificationResult.updatedAt,
                    };
                }
            } catch (ocrErr) {
                console.error('OCR processing error (non-blocking):', ocrErr.message);
            }
        }

        user.role = 'teacher';
        user.collegeId = matchedCollege._id;
        user.collegeName = matchedCollege.name;
        user.collegeApprovalStatus = 'pending';
        user.idVerification = idVerification;
        if (uploadResult) {
            user.collegeIdPhoto = uploadResult.secure_url;
            user.collegeIdPhotoPublicId = uploadResult.public_id;
        }
        if (!user.position) user.position = 'Other';
        if (!user.department) user.department = 'Not specified';
        if (!user.stream) user.stream = 'Other';
        await user.save();

        try {
            await logAudit({
                userId: user._id,
                action: 'UPGRADE_TO_TEACHER',
                resource: `User:${user._id}`,
                changes: {
                    oldValue: { role: 'student' },
                    newValue: { role: 'teacher', affiliation: 'affiliated', collegeId: matchedCollege._id },
                    fields: ['role', 'collegeId', 'collegeApprovalStatus'],
                },
                request: req,
            });
        } catch (auditErr) {
            console.error('Audit log failed (non-blocking):', auditErr.message);
        }

        if (uploadResult) {
            try {
                await OCRLog.create({
                    userId: user._id,
                    userInput: {
                        fullName: user.fullName,
                        employeeId: user.employeeId,
                        collegeName: matchedCollege.name,
                        department: user.department,
                    },
                    extractedData: idVerification.extractedData,
                    matchedFields: idVerification.matchedFields,
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    ocrRawText,
                    imageUrl: uploadResult.secure_url,
                });
            } catch (logErr) {
                console.error('OCR log save failed (non-blocking):', logErr.message);
            }
        }

        try {
            const admins = await User.find({
                collegeId: matchedCollege._id,
                role: 'admin',
            }).select('_id').lean();

            for (const admin of admins) {
                createNotification({
                    userId: admin._id,
                    type: 'pending_teacher_approval',
                    title: 'Student upgraded — awaiting approval',
                    message: `${user.fullName} (${user.email}) upgraded to teacher and is awaiting approval at ${matchedCollege.name}.`,
                    relatedDocId: user._id,
                    actionUrl: `/college-admin/pending-teachers/${user._id}`,
                }).catch(() => {});
            }
        } catch (notifErr) {
            console.error('Admin notification dispatch failed (non-blocking):', notifErr.message);
        }

        return res.json({
            error: false,
            message: `Your upgrade to teacher at ${matchedCollege.name} has been submitted for approval.`,
            requiresApproval: true,
            accountState: 'pending_approval',
        });
    } catch (err) {
        console.error('upgradeToTeacher error:', err);
        return res.status(500).json({ error: true, message: 'Server error.' });
    }
};

// ============================================================
// BULK REGISTER — TEMPLATE + FORMAT (public helpers)
// ============================================================

/**
 * GET /auth/bulk-register/template
 */
const downloadBulkTemplate = (req, res) => {
    const csv = [
        'email,password,fullName,userName,phone,role,collegeId,position,employeeId,department,stream',
        'john.doe@college.edu,TempPass123!,John Doe,john_doe,9876543210,teacher,,Assistant Professor,EMP001,Computer Science,Engineering',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="qmetric-bulk-template.csv"');
    return res.send(csv);
};

/**
 * GET /auth/bulk-register/format
 */
const getBulkFormat = (req, res) => {
    return res.json({
        error: false,
        format: {
            maxRows: 500,
            requiredHeaders: ['email', 'password', 'fullName', 'userName', 'phone'],
            optionalHeaders: ['role', 'collegeId', 'position', 'employeeId', 'department', 'stream'],
            supportedRoles: ['teacher', 'reviewer'],
            columns: [
                { name: 'email',      type: 'string', required: true,  example: 'john@college.edu',     constraints: 'valid email, max 254 chars' },
                { name: 'password',   type: 'string', required: false, example: 'TempPass123',          constraints: 'min 8 chars, 1 upper, 1 lower, 1 number; may use defaultPassword' },
                { name: 'fullName',   type: 'string', required: true,  example: 'John Doe',             constraints: '2-100 chars' },
                { name: 'userName',   type: 'string', required: true,  example: 'john_doe',             constraints: '3-30 chars' },
                { name: 'phone',      type: 'string', required: true,  example: '9876543210',           constraints: 'exactly 10 digits' },
                { name: 'role',       type: 'string', required: false, example: 'teacher',              constraints: 'teacher | reviewer (default: teacher)' },
                { name: 'collegeId',  type: 'string', required: false, example: '65a3...',              constraints: 'Mongo ObjectId of active college' },
                { name: 'position',   type: 'string', required: false, example: 'Assistant Professor', constraints: 'Professor | Associate Professor | Assistant Professor | Lecturer | HoD | Other' },
                { name: 'employeeId', type: 'string', required: false, example: 'EMP001',               constraints: 'unique per system' },
                { name: 'department', type: 'string', required: false, example: 'Computer Science',    constraints: 'free text' },
                { name: 'stream',     type: 'string', required: false, example: 'Engineering',          constraints: 'Engineering | Management | Science | Commerce | Arts | Law | Medicine | Other' },
            ],
            requestOptions: {
                dryRun: 'boolean (default false) — validate only, no writes',
                rollbackOnError: 'boolean (default false) — if true, any invalid row rejects the entire batch',
            },
        },
    });
};

// ============================================================
// FORGOT & RESET PASSWORD (C1)
// ============================================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
            return res.status(400).json({ error: true, message: 'Valid email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Do not leak whether user exists
            return res.json({
                error: false,
                message: 'If an account with that email exists, password reset instructions have been sent.',
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save({ validateBeforeSave: false });

        emailService.sendPasswordResetEmail({
            to: user.email,
            fullName: user.fullName || user.userName,
            resetToken: rawToken,
        }).catch((err) => {
            console.error('Password reset email failed (non-blocking):', err.message);
        });

        await logAudit({
            userId: user._id,
            action: 'FORGOT_PASSWORD',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'If an account with that email exists, password reset instructions have been sent.',
        });
    } catch (err) {
        console.error('forgotPassword error:', err);
        return res.status(500).json({ error: true, message: 'Server error processing password reset.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body || {};

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: true, message: 'Reset token is required.' });
        }

        if (!password || !isStrongPassword(password)) {
            return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        }).select('+passwordResetToken +passwordResetExpires');

        if (!user) {
            return res.status(400).json({
                error: true,
                message: 'Invalid or expired password reset link. Please request a new one.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user.password = hashedPassword;
        user.passwordChangedAt = new Date();
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;

        await user.save({ validateBeforeSave: false });

        await logAudit({
            userId: user._id,
            action: 'RESET_PASSWORD',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'Password reset successful. You can now log in with your new password.',
        });
    } catch (err) {
        console.error('resetPassword error:', err);
        return res.status(500).json({ error: true, message: 'Server error resetting password.' });
    }
};

// ============================================================
// REFRESH TOKEN & SESSION REVOCATION (C2)
// ============================================================
const refreshToken = async (req, res) => {
    try {
        const tokenFromCookie = req.cookies?.refreshToken;
        const tokenFromBody = req.body?.refreshToken;

        const token = tokenFromCookie || tokenFromBody;

        // Browser requests use the HttpOnly cookie and do not receive
        // credentials in the JSON response.
        // API/test clients that explicitly send the token in the body
        // receive the rotated tokens in the response body.
        const returnTokensInBody =
            !tokenFromCookie &&
            typeof tokenFromBody === 'string';

        if (!token || typeof token !== 'string') {
            return res.status(401).json({
                error: true,
                message: 'Refresh token required.'
            });
        }

        const hashed = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Atomic token rotation prevents two concurrent requests from
        // successfully rotating the same refresh token.
        const newRawRefresh = crypto
            .randomBytes(40)
            .toString('hex');

        const newHash = crypto
            .createHash('sha256')
            .update(newRawRefresh)
            .digest('hex');

        const newRefreshExpiry = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        const user = await User.findOneAndUpdate(
            {
                refreshTokenHash: hashed,
                refreshTokenExpiresAt: {
                    $gt: new Date()
                },
                isBlocked: {
                    $ne: true
                },
            },
            {
                $set: {
                    refreshTokenHash: newHash,
                    refreshTokenExpiresAt: newRefreshExpiry,
                },
            },
            {
                new: true,
                runValidators: false
            }
        ).select(
            '+refreshTokenHash +refreshTokenExpiresAt'
        );

        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'Invalid or expired refresh token.'
            });
        }

        const accessToken = jwt.sign(
            {
                userId: user._id
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: '24h'
            }
        );

        res.cookie(
            'accessToken',
            accessToken,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge:
                    24 * 60 * 60 * 1000,
            }
        );

        res.cookie(
            'refreshToken',
            newRawRefresh,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge:
                    7 * 24 * 60 * 60 * 1000,
                path: '/auth',
            }
        );

        await logAudit({
            userId: user._id,
            action: 'REFRESH_TOKEN',
            resource: `User:${user._id}`,
            request: req,
        });

        const response = {
            error: false,
            message: 'Token refreshed successfully.',
        };

        if (returnTokensInBody) {
            response.accessToken = accessToken;
            response.refreshToken = newRawRefresh;
        }

        return res.json(response);
    } catch (err) {
        console.error(
            'refreshToken error:',
            err
        );

        return res.status(500).json({
            error: true,
            message:
                'Server error refreshing token.'
        });
    }
};
const revokeAllSessions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: true, message: 'Unauthenticated.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }

        user.passwordChangedAt = new Date();
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;
        await user.save({ validateBeforeSave: false });

        const currentToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
        if (currentToken) {
            await revoke(currentToken);
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/auth',
        });

        await logAudit({
            userId: user._id,
            action: 'REVOKE_ALL_SESSIONS',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'All active sessions have been revoked. Please log in again.',
        });
    } catch (err) {
        console.error('revokeAllSessions error:', err);
        return res.status(500).json({ error: true, message: 'Server error revoking sessions.' });
    }
};

module.exports = {
    login,
    register,
    bulkRegister,
    createAdmin,
    verifyEmail,
    resendVerificationEmail,
    downloadBulkTemplate,
    getBulkFormat,
    requestAffiliation,
    upgradeToTeacher,
    forgotPassword,
    resetPassword,
    refreshToken,
    revokeAllSessions,
};