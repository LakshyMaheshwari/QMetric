const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');
const cloudinary = require('../config/cloudinary');

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
    const mismatchedFields = [];
    let matchCount = 0;

    for (const field of fieldsToCheck) {
        const extracted = extractedData[field];
        const userValue = userInputs[field];

        if (extracted && userValue && fuzzyMatch(userValue, extracted)) {
            matchCount++;
        } else if (extracted) {
            // OCR found something but it doesn't match user input
            mismatchedFields.push(field);
        }
        // If OCR didn't extract the field at all, we don't penalize
    }

    // Calculate confidence as percentage of matched fields
    const confidence = Math.round((matchCount / fieldsToCheck.length) * 100);

    let status = 'unverified';
    if (matchCount === fieldsToCheck.length) {
        status = 'verified';
    } else if (mismatchedFields.length > 0) {
        status = 'flagged';
    }
    // If nothing was extracted at all, stays 'unverified'

    return {
        status,
        extractedData,
        matchedFields: mismatchedFields, // fields that MISMATCHED
        confidence,
        ocrRawText: ocrText.substring(0, 2000), // cap raw text storage
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
    console.log(" Login request received:", req.body);
    const { email, password } = req.body;

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
        console.log(" User not found:", email);
        return res.status(404).json({
            error: true,
            message: "User does not exist.",
        });
    }

    console.log("User found:", email);

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        console.log("Invalid password for:", email);
        return res.status(401).json({
            error: true,
            message: "Invalid credentials",
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
            user: { userName: user.userName, email: user.email },
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
    console.log(" Register request received:", req.body);
    try {
        const { userName, email, password, fullName, phone, collegeName, position, employeeId, department, stream } = req.body;
        const file = req.file; // Provided by multer (memoryStorage → file.buffer)

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

        // --- Step 2: Upload image to Cloudinary with OCR ---
        let uploadResult;
        try {
            uploadResult = await uploadToCloudinaryWithOcr(file.buffer);
            console.log(' Cloudinary upload successful:', uploadResult.secure_url);
        } catch (uploadErr) {
            console.error(' Cloudinary upload failed:', uploadErr.message);
            return res.status(500).json({ error: true, message: "Failed to upload ID photo. Please try again." });
        }

        // --- Step 3 & 4: Parse OCR response and extract fields ---
        let idVerification;
        try {
            const ocrText = extractOcrText(uploadResult);
            console.log(' OCR raw text:', ocrText ? ocrText.substring(0, 200) + '...' : '(empty)');

            if (!ocrText || ocrText.trim().length === 0) {
                console.log(' No text detected by OCR — marking as unverified');
                idVerification = {
                    status: 'unverified',
                    extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
                    matchedFields: [],
                    confidence: 0,
                    ocrRawText: '',
                    updatedAt: new Date()
                };
            } else {
                // --- Step 5 & 6: Compare extracted values and determine status ---
                idVerification = runOcrVerification(ocrText, { fullName, employeeId, collegeName, department });
                console.log(' OCR verification result:', {
                    status: idVerification.status,
                    confidence: idVerification.confidence,
                    matchedFields: idVerification.matchedFields,
                    extractedData: idVerification.extractedData
                });
            }
        } catch (ocrErr) {
            // --- Step 7: On ANY OCR error, default to unverified ---
            console.error(' OCR processing error (non-blocking):', ocrErr.message);
            idVerification = {
                status: 'unverified',
                extractedData: { fullName: '', employeeId: '', collegeName: '', department: '' },
                matchedFields: [],
                confidence: 0,
                ocrRawText: '',
                updatedAt: new Date()
            };
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
            collegeIdPhoto: uploadResult.secure_url,
            idVerification
        });

        await newUser.save();
        console.log(' User created:', email, '| Verification:', idVerification.status);

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

module.exports = {
    login,
    register
};
