const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');

// Login Controller
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

// Register Controller
const register = async (req, res) => {
    console.log(" Register request received:", req.body);
    try {
        const { userName, email, password, fullName, phone, collegeName, position, employeeId, department, stream } = req.body;
        const file = req.file; // Provided by multer

        // Basic validation
        if (!userName || !email || !password || !fullName || !phone || !collegeName || !position || !employeeId || !department || !stream) {
            return res.status(400).json({ error: true, message: "All fields are required." });
        }

        if (!file) {
            return res.status(400).json({ error: true, message: "College ID photo is required." });
        }

        // Check for existing user by email, phone, or employeeId
        const existingUser = await User.findOne({ $or: [{ email }, { phone }, { employeeId }] });
        if (existingUser) {
            let conflictField = "User";
            if (existingUser.email === email) conflictField = "Email";
            else if (existingUser.phone === phone) conflictField = "Phone number";
            else if (existingUser.employeeId === employeeId) conflictField = "Employee ID";
            return res.status(409).json({ error: true, message: `${conflictField} already exists in the system.` });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
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
            collegeIdPhoto: file.path // The URL returned by Cloudinary
        });

        await newUser.save();
        console.log(" User created:", email);

        // Generate JWT Token
        const accessToken = jwt.sign(
            { userId: newUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "72h" }
        );

        return res.status(201).json({
            error: false,
            message: "Account created successfully.",
            user: { userName: newUser.userName, email: newUser.email },
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
