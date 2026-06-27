// routes/authRoutes.js

const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { optionalAuth, protect } = require('../middlewares/auth');
const { issueCsrfToken } = require('../middlewares/csrf');

// =========================
// Controllers
// =========================
const {
    registerVendor,
    registerCustomer,
    checkSubdomain,
    login,
    logout,
    getMe,
    sendOTP,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    updatePassword
} = require('../controllers/authController');

// ======================================================
// AUTH ROUTES
// ======================================================

router.get(
    '/csrf-token',
    issueCsrfToken
);

router.get(
    '/check-subdomain',
    checkSubdomain
);

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

// Request password reset OTP
router.post(
    '/forgot-password',
    forgotPassword
);

// Verify password reset OTP
router.post(
    '/verify-reset-otp',
    verifyResetOtp
);

// Complete password reset
router.post(
    '/reset-password',
    resetPassword
);

// Authenticated password change
router.put(
    '/update-password',
    protect,
    updatePassword
);

// Logout
router.post(
    '/logout',
    logout
);

// Get Current Logged In User
router.get(
    '/me',
    optionalAuth,
    getMe
);

// =========================
// Export Router
// =========================
module.exports = router;
