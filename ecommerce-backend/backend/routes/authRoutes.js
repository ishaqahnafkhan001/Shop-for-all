// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerVendor,registerCustomer, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', registerVendor);
// Add this to your authRoutes.js
router.post('/register-customer', registerCustomer);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe); // Protecting this ensures only valid tokens can check sessions

module.exports = router;