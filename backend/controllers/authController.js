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

module.exports = {
    login,
};
