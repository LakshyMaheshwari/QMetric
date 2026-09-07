const User = require('../Model/user');

const getProfile = async (req, res) => {
    try {
        // req.user is set by the authenticateToken middleware
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }
        res.json({ error: false, user });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: true, message: 'Server error fetching profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, collegeName, department } = req.body;
        
        // Validate required fields
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ error: true, message: 'Name is required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        // Update fields
        user.fullName = fullName.trim();
        user.userName = fullName.trim(); // Keep userName in sync if applicable
        if (phone !== undefined) user.phone = phone.trim();
        if (collegeName !== undefined) user.collegeName = collegeName.trim();
        if (department !== undefined) user.department = department.trim();

        await user.save();
        
        // Fetch updated user without password
        const updatedUser = await User.findById(req.user.userId).select('-password');
        
        res.json({ error: false, message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: true, message: 'Server error updating profile', details: err.message });
    }
};

module.exports = {
    getProfile,
    updateProfile
};
