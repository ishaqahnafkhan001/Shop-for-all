const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUserSchema, loginUserSchema } = require('../validations/userValidation');

/**
 * @desc    Login any user (SuperAdmin, Vendor, Staff, or Customer)
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        // 1. Validate the incoming request
        const { error, value } = loginUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = value;

        // 2. Find the user in the database
        // We use .lean() for a slight performance boost since we just need to read the data
        const user = await User.findOne({ email }).lean();
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 3. Verify the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 4. Generate the JWT Payload
        // This is crucial: We embed their role and shop_id directly into the token
        const payload = {
            userId: user._id,
            role: user.role,
            shopId: user.shop_id // Will be undefined for SuperAdmins, which is fine
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 5. Send the secure HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only true if deployed to HTTPS
            domain: process.env.NODE_ENV === 'production' ? '.yourwebsite.com' : 'localhost',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // 6. Send the user data (WITHOUT the password) to the frontend React app
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                shopId: user.shop_id
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login" });
    }
};


/**
 * @desc    Create a new Staff member or Customer (Vendor Action)
 * @route   POST /api/admin/users
 */
exports.createShopUser = async (req, res) => {
    try {
        // 1. Validate input
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        // 2. Check if email is already in use across the ENTIRE platform
        const existingUser = await User.findOne({ email: value.email });
        if (existingUser) {
            return res.status(400).json({ error: "Email is already registered" });
        }

        // 3. THE SECURITY LOCK: Force the shop_id from the logged-in vendor's token
        // Do NOT trust the frontend to send the correct shop_id.
        const currentShopId = req.user.shopId;

        // 4. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(value.password, salt);

        // 5. Create the user
        const newUser = await User.create({
            fullName: value.fullName,
            email: value.email,
            password: hashedPassword,
            role: value.role,
            shop_id: currentShopId // Enforcing tenant isolation
        });

        res.status(201).json({
            message: `${value.role} created successfully`,
            user: { id: newUser._id, fullName: newUser.fullName, email: newUser.email, role: newUser.role }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
};


/**
 * @desc    Get all users (Staff/Customers) for a specific shop
 * @route   GET /api/admin/users
 */
exports.getShopUsers = async (req, res) => {
    try {
        // Security: Only fetch users that belong to the logged-in vendor's shop
        const users = await User.find({ shop_id: req.user.shopId })
            .select('-password') // Never send hashed passwords to the frontend!
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};


/**
 * @desc    Logout user (Clear Cookie)
 * @route   POST /api/auth/logout
 */
exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
        httpOnly: true
    });
    res.status(200).json({ message: "Logged out successfully" });
};