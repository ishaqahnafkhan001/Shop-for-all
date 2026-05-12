const Shop = require('../models/Shop');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { shopRegistrationSchema } = require('../validations/shopValidation');
const { loginUserSchema, registerCustomerSchema } = require('../validations/userValidation');
const OTP = require('../models/OTP');

// --- SEND OTP ---
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        const transporter = nodemailer.createTransport({
            host: 'mail.spacemail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            from: `"ScaleUp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verification Code",
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5;">Verification Code</h2>
                    <p>Use the following code to complete your registration:</p>
                    <h1 style="letter-spacing: 5px; color: #1e293b;">${otp}</h1>
                    <p style="color: #64748b; font-size: 12px;">This code will expire in 5 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "OTP sent to email" });

    } catch (error) {
        console.error("Backend OTP Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- REGISTER VENDOR ---
exports.registerVendor = async (req, res) => {
    try {
        const { error, value } = shopRegistrationSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { shopName, subdomain, email, password, fullName, otp } = value;
        console.log(value)
        const otpRecord = await OTP.findOne({ email });
        // Use String() to ensure comparison works regardless of type
        if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
            return res.status(400).json({ error: "Invalid or expired verification code." });
        }

        const existingShop = await Shop.findOne({ subdomain });
        if (existingShop) return res.status(400).json({ error: "Subdomain already taken." });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });

        const newShop = await Shop.create({ shopName, subdomain });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: 'VendorAdmin',
            shop_id: newShop._id
        });

        await OTP.deleteOne({ email });

        const token = jwt.sign(
            { id: newAdmin._id, role: newAdmin.role, shopId: newAdmin.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 1. Define base cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

// 2. Only add the domain explicitly if in production
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.domain = '.scaleup.codes';
        }

// 3. Set the cookie
        res.cookie('token', token, cookieOptions);

        res.status(201).json({
            message: "Shop and Vendor account created successfully",
            user: { id: newAdmin._id, fullName: newAdmin.fullName, shopId: newShop._id }
        });

        if (error) {
            console.log("JOI VALIDATION ERROR:", error.details[0].message); // 🔥 Check terminal for this!
            return res.status(400).json({ error: error.details[0].message });
        }
    } catch (err) {
        console.log("Full Error Object:", err);
        res.status(500).json({
            error: "Registration failed",
            dev_details: err.message
        });
    }
};

// --- REGISTER CUSTOMER ---
exports.registerCustomer = async (req, res) => {
    try {
        const { error, value } = registerCustomerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { fullName, email, password, subdomain, otp } = value;
        console.log(value)
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
            return res.status(400).json({ error: "Invalid or expired verification code." });
        }

        const targetShop = await Shop.findOne({ subdomain });
        if (!targetShop) return res.status(404).json({ error: "Storefront not found." });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newCustomer = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: 'Customer',
            shop_id: targetShop._id
        });

        await OTP.deleteOne({ email });

        const token = jwt.sign(
            { id: newCustomer._id, role: newCustomer.role, shopId: newCustomer.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 1. Define base cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

// 2. Only add the domain explicitly if in production
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.domain = '.scaleup.codes';
        }

// 3. Set the cookie
        res.cookie('token', token, cookieOptions);

        res.status(201).json({
            success: true,
            user: { id: newCustomer._id, fullName: newCustomer.fullName, role: newCustomer.role }
        });
        if (error) {
            console.log("JOI VALIDATION ERROR:", error.details[0].message); // 🔥 Check terminal for this!
            return res.status(400).json({ error: error.details[0].message });
        }

    } catch (err) {
        console.error("Reg Error:", err);
        res.status(500).json({ error: "Registration failed." });
    }
};

// --- LOGIN ---
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
            { id: user._id, role: user.role, shopId: user.shop_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 1. Define base cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

// 2. Only add the domain explicitly if in production
        if (process.env.NODE_ENV === 'production') {
            cookieOptions.domain = '.scaleup.codes';
        }

// 3. Set the cookie
        res.cookie('token', token, cookieOptions);
        console.log(token)
        res.status(200).json({
            message: "Login successful",
            token: token,
            user: { id: user._id, fullName: user.fullName, role: user.role, shopId: user.shop_id, email: user.email }
        });

    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
};

// --- GET ME ---
// Make sure this is at the top of your file
// const Shop = require('../models/Shop');

exports.getMe = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        if (!userId) {
            return res.status(400).json({ error: "User ID missing from request" });
        }

        // 1. Fetch user. Use .lean() to return a plain JS object instead of a Mongoose document.
        // This allows us to easily inject new properties (like shopName) into it.
        const user = await User.findById(userId).select('-password').lean();

        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Look up the shop using the user's shop_id
        if (user.shop_id) {
            const shop = await Shop.findById(user.shop_id).select('shopName subdomain').lean();

            // 3. Attach the shop data directly to the user object
            if (shop) {
                user.shopName = shop.shopName;
                user.subdomain = shop.subdomain;
            }
        }

        // Return the user (now containing shopName and subdomain) so the frontend can restore the session
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error("GetMe Error:", err);
        res.status(500).json({ error: "Error fetching user session" });
    }
};// --- LOGOUT ---
exports.logout = (req, res) => {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(0) // Set to a date in the past to delete immediately
    };

    if (process.env.NODE_ENV === 'production') {
        cookieOptions.domain = '.scaleup.codes';
    }

    res.cookie('token', 'none', cookieOptions);
    res.status(200).json({ message: "Logged out successfully" });
};