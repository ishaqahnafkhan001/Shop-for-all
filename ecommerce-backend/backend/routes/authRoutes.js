// routes/authRoutes.js

const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { protect } = require('../middlewares/auth');

// =========================
// Controllers
// =========================
const {
    registerVendor,
    registerCustomer,
    login,
    logout,
    getMe,
    sendOTP
} = require('../controllers/authController');

// ======================================================
// AUTH ROUTES
// ======================================================

// Vendor Registration
router.post(
    '/register',
    registerVendor
);

// Customer Registration
router.post(
    '/register-customer',
    registerCustomer
);

// Send OTP
router.post(
    '/send-otp',
    sendOTP
);

// Login
router.post(
    '/login',
    login
);

// Logout
router.post(
    '/logout',
    logout
);

// Get Current Logged In User
router.get(
    '/me',
    protect,
    getMe
);

// =========================
// Export Router
// =========================
module.exports = router;