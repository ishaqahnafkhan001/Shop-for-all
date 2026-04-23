const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUserSchema, loginUserSchema } = require('../validations/userValidation');

/**
 * @desc    Login user & return JWT
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        // 1. Validate input
        const { error, value } = loginUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        // 2. Check if user exists
        const user = await User.findOne({ email: value.email });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        // 3. Verify password
        const isMatch = await bcrypt.compare(value.password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        // 4. Create JWT Payload
        const payload = {
            id: user._id,
            shopId: user.shop_id,
            role: user.role
        };

        // 5. Sign Token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 6. Send response (Optionally set as HTTP-only cookie for better security)
        res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user._id, fullName: user.fullName, role: user.role, shopId: user.shop_id }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login" });
    }
};



/**
 * @desc    Create a new Staff/Customer (Vendor Action)
 * @route   POST /api/admin/users
 */
exports.createShopUser = async (req, res) => {
    try {
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const existingUser = await User.findOne({ email: value.email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        // Pull shop_id from the authenticated vendor's token (req.user)
        const currentShopId = req.user.shopId;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(value.password, salt);

        const newUser = await User.create({
            ...value,
            password: hashedPassword,
            shop_id: currentShopId
        });

        res.status(201).json({
            message: `${value.role} created successfully`,
            user: { id: newUser._id, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to create user" });
    }
};

/**
 * @desc    Get all users for the logged-in vendor's shop
 * @route   GET /api/admin/users
 */
exports.getShopUsers = async (req, res) => {
    try {
        const users = await User.find({ shop_id: req.user.shopId })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 */
exports.logout = (req, res) => {
    // If using cookies, clear the cookie. If using LocalStorage,
    // the frontend simply deletes the token.
    res.status(200).json({ message: "Logged out successfully" });
};