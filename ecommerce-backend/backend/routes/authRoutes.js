const express = require('express');
const router = express.Router();

// Import the controllers (Make sure your file paths match your folder structure)
const { registerVendor } = require('../controllers/authController');
const { login, logout } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new Shop and a Vendor Admin user
 * @access  Public
 */
router.post('/register', registerVendor);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token via HttpOnly Cookie
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    Log user out / clear cookie
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private (Requires JWT)
 */
router.get('/me', protect, (req, res) => {
    // This route is used by React to verify the session on page refresh
    // 'req.user' is available here because the 'protect' middleware added it
    res.status(200).json({
        success: true,
        user: req.user
    });
});

module.exports = router;