const Shop = require('../models/Shop');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { shopRegistrationSchema } = require('../validations/shopValidation');
const { loginUserSchema,createUserSchema } = require('../validations/userValidation');

/**
 * @desc    Register a new Vendor (Creates Shop + Admin User)
 * @route   POST /api/auth/register-vendor
 */
exports.registerVendor = async (req, res) => {
    try {
        const { error, value } = shopRegistrationSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { shopName, subdomain, email, password, fullName } = value;

        // 1. Check if Shop Subdomain exists
        const existingShop = await Shop.findOne({ subdomain });
        if (existingShop) return res.status(400).json({ error: "Subdomain already taken." });

        // 2. Check if User Email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });

        // 3. Create the Shop
        const newShop = await Shop.create({ shopName, subdomain });

        // 4. Hash Password & Create Admin User for that shop
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: 'VendorAdmin',
            shop_id: newShop._id
        });

        // 5. Issue JWT (Optional: Auto-login after registration)
        const token = jwt.sign(
            { userId: newAdmin._id, role: newAdmin.role, shopId: newAdmin.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            message: "Shop and Vendor account created successfully",
            user: { id: newAdmin._id, fullName: newAdmin.fullName, shopId: newShop._id }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
};



exports.registerCustomer = async (req, res) => {
    try {
        // 1. Validate (Now Joi allows 'subdomain')
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { fullName, email, password, subdomain } = value;

        // 2. ✨ THE DETECTIVE WORK: Find the Shop ID using the Subdomain
        const targetShop = await Shop.findOne({ subdomain });
        if (!targetShop) {
            return res.status(404).json({ error: "Storefront not found." });
        }

        // 3. Check for existing email
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });

        // 4. Secure the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Save the Customer with the REAL shop_id
        const newCustomer = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: 'Customer',
            shop_id: targetShop._id // ✨ We link the ID found in Step 2
        });

        // 6. Generate JWT and Cookie (Keep your existing code here...)
        const token = jwt.sign(
            { userId: newCustomer._id, role: newCustomer.role, shopId: newCustomer.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            user: { id: newCustomer._id, fullName: newCustomer.fullName, role: newCustomer.role }
        });

    } catch (err) {
        console.error("Reg Error:", err);
        res.status(500).json({ error: "Registration failed." });
    }
};

/**
 * @desc    Login user & Set HttpOnly Cookie
 */
exports.login = async (req, res) => {
    try {
        const { error, value } = loginUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = value;

        const user = await User.findOne({ email }).lean();
        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        const token = jwt.sign(
            { userId: user._id, role: user.role, shopId: user.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        console.log(token)
        res.status(200).json({
            message: "Login successful",
            user: { id: user._id, fullName: user.fullName, role: user.role, shopId: user.shop_id }
        });

    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
};

/**
 * @desc    Get Current Logged-in User Info
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Error fetching user session" });
    }
};

/**
 * @desc    Logout (Clear Cookie)
 */
exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 5000), // Expire immediately
        httpOnly: true
    });
    res.status(200).json({ message: "Logged out successfully" });
};