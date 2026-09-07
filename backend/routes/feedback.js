const express = require('express');
const router = express.Router();
const Feedback = require('../Model/Feedback');
const User = require('../Model/user');
const authenticateToken = require('../core/auth/utilities');

/**
 * POST /feedback
 * Submit feedback — authenticated users only.
 * Body: { rating: number (0-100), feedback: string }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    // Validate inputs
    if (rating === undefined || rating === null) {
      return res.status(400).json({ error: true, message: 'Rating is required.' });
    }
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: true, message: 'Feedback text is required.' });
    }
    if (rating < 0 || rating > 100) {
      return res.status(400).json({ error: true, message: 'Rating must be between 0 and 100.' });
    }

    // Fetch user info from DB to include name/email in the record
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    const newFeedback = new Feedback({
      userId: req.user.userId,
      userEmail: user.email,
      userName: user.userName,
      rating,
      feedback: feedback.trim(),
    });

    await newFeedback.save();

    return res.status(201).json({
      error: false,
      message: 'Feedback submitted successfully.',
      data: newFeedback,
    });
  } catch (err) {
    console.error('POST /feedback error:', err.message);
    return res.status(500).json({ error: true, message: 'Server error while saving feedback.' });
  }
});

/**
 * GET /feedback
 * Retrieve all feedback — admin only.
 * Admin check: looks for isAdmin flag on User document.
 * Sorted by newest first.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: true, message: 'Access denied. Admins only.' });
    }

    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ error: false, data: feedbacks });
  } catch (err) {
    console.error('GET /feedback error:', err.message);
    return res.status(500).json({ error: true, message: 'Server error while fetching feedback.' });
  }
});

/**
 * PUT /feedback/:id/resolve
 * Mark a specific feedback as resolved — admin only.
 */
router.put('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ error: true, message: 'Access denied. Admins only.' });
    }

    const feedbackItem = await Feedback.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { new: true }
    );

    if (!feedbackItem) {
      return res.status(404).json({ error: true, message: 'Feedback not found.' });
    }

    return res.status(200).json({
      error: false,
      message: 'Feedback marked as resolved.',
      data: feedbackItem,
    });
  } catch (err) {
    console.error('PUT /feedback/:id/resolve error:', err.message);
    return res.status(500).json({ error: true, message: 'Server error while resolving feedback.' });
  }
});

module.exports = router;
