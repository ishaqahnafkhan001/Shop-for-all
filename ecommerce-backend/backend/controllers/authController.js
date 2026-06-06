const Shop = require('../models/Shop');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Account = require('../models/Account');
const ShopMembership = require('../models/ShopMembership');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../services/mail/mailService');

const { shopRegistrationSchema } = require('../validations/shopValidation');
const {
    loginUserSchema,
    registerCustomerSchema
} = require('../validations/userValidation');
const {
    normalizeEmail,
    createMembershipArtifacts,
    createAccountForLegacyUser,
    createMembershipForLegacyUser
} = require('../services/identityService');

const signSessionToken = ({ account, membership, user }) => jwt.sign(
    {
        id: user._id,
        accountId: account._id,
        membershipId: membership?._id || null,
        role: user.role,
        shopId: user.shop_id || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);


const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        // Prevents client-side scripts from accessing the cookie (XSS protection)
        httpOnly: true,

        // Must be true in production because SameSite: 'none' requires HTTPS
        // In local dev, this is usually false unless you use an SSL proxy
        secure: isProduction,

        // 'none' is required for cross-site (Vercel domain vs Railway domain)
        // 'lax' is better once you move both to subdomains of the same root domain
        sameSite: 'lax',
        // CHIPS (Cookies Having Independent Partitioned State)
        // This helps the cookie work in Incognito/Third-party contexts in modern browsers
        partitioned: isProduction,

        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days

        path: '/',

        // Keep the session cookie scoped to the API host. A shared root-domain
        // cookie lets any tenant subdomain initiate credentialed requests.
        domain: undefined,
    };
};
exports.sendOTP = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTP.findOneAndUpdate(
            { email },
            {
                otp,
                createdAt: Date.now()
            },
            {
                upsert: true,
                new: true
            }
        );

        await sendMail({
            type: 'admin',
            to: email,
            senderName: 'ScaleUp',
            recipientName: 'Customer',
            subject: 'Verification Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5;">Verification Code</h2>
                    <p>Use the following code to complete your registration:</p>
                    <h1 style="letter-spacing: 5px; color: #1e293b;">${otp}</h1>
                    <p style="color: #64748b; font-size: 12px;">
                        This code will expire in 5 minutes.
                    </p>
                </div>
            `
        });

        res.status(200).json({
            success: true,
            message: 'OTP sent to email'
        });

    } catch (error) {
        console.error('Backend OTP Error:', error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.registerVendor = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error, value } = shopRegistrationSchema.validate(req.body);

        if (error) {
            await session.abortTransaction();
            return res.status(400).json({
                error: error.details[0].message
            });
        }

        const {
            shopName,
            subdomain,
            email,
            password,
            fullName,
            otp
        } = value;
        const cleanEmail = normalizeEmail(email);

        const otpRecord = await OTP.findOne({ email: cleanEmail }).session(session);

        if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'Invalid or expired verification code.'
            });
        }

        const existingShop = await Shop.findOne({ subdomain }).session(session);

        if (existingShop) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'Subdomain already taken.'
            });
        }

        const existingAccount = await Account.findOne({ email: cleanEmail }).session(session);

        if (existingAccount) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'This email already has a platform account. Use a different owner email for this shop.'
            });
        }

        const [newShop] = await Shop.create([{
            shopName,
            subdomain
        }], { session });

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        const [account] = await Account.create([{
            fullName,
            email: cleanEmail,
            passwordHash: hashedPassword
        }], { session });

        const { legacyUser: newAdmin, membership } = await createMembershipArtifacts({
            account,
            shopId: newShop._id,
            role: 'VendorAdmin',
            fullName,
            passwordHash: hashedPassword,
            session
        });

        await OTP.deleteOne({ email: cleanEmail }).session(session);

        await session.commitTransaction();

        const token = signSessionToken({ account, membership, user: newAdmin });

        res.cookie('token', token, getCookieOptions());

        res.status(201).json({
            message: 'Shop and Vendor account created successfully',
            user: {
                id: newAdmin._id,
                fullName: newAdmin.fullName,
                shopId: newShop._id
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Register Vendor Error:', err);

        res.status(500).json({
            error: 'Registration failed',
            dev_details: err.message
        });
    } finally {
        session.endSession();
    }
};

exports.registerCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error, value } = registerCustomerSchema.validate(req.body);

        if (error) {
            await session.abortTransaction();
            return res.status(400).json({
                error: error.details[0].message
            });
        }

        const {
            fullName,
            email,
            password,
            subdomain,
            otp
        } = value;
        const cleanEmail = normalizeEmail(email);

        const otpRecord = await OTP.findOne({ email: cleanEmail }).session(session);

        if (!otpRecord || String(otpRecord.otp) !== String(otp)) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'Invalid or expired verification code.'
            });
        }

        const targetShop = await Shop.findOne({ subdomain }).session(session);

        if (!targetShop) {
            await session.abortTransaction();
            return res.status(404).json({
                error: 'Storefront not found.'
            });
        }

        let account = await Account.findOne({ email: cleanEmail }).session(session);
        const existingShopCustomer = await User.findOne({
            email: cleanEmail,
            shop_id: targetShop._id,
            role: 'Customer'
        }).session(session);

        if (account) {
            const passwordMatches = await bcrypt.compare(password, account.passwordHash);
            if (!passwordMatches) {
                await session.abortTransaction();
                return res.status(401).json({
                    error: 'This email already has an account. Use the account password to join this shop.'
                });
            }
        }

        if (existingShopCustomer?.account_id) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'This account is already registered in this shop.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = account?.passwordHash || await bcrypt.hash(password, salt);

        if (!account) {
            const [newAccount] = await Account.create([{
                fullName,
                email: cleanEmail,
                passwordHash: hashedPassword
            }], { session });
            account = newAccount;
        }

        if (existingShopCustomer) {
            existingShopCustomer.fullName = fullName;
            existingShopCustomer.password = hashedPassword;
            existingShopCustomer.phone = value.phone || existingShopCustomer.phone || '';
            existingShopCustomer.status = 'Active';

            const membership = await createMembershipForLegacyUser(existingShopCustomer, account, session);

            await OTP.deleteOne({ email: cleanEmail }).session(session);
            await session.commitTransaction();

            const token = signSessionToken({ account, membership, user: existingShopCustomer });

            res.cookie('token', token, getCookieOptions());

            return res.status(201).json({
                success: true,
                user: {
                    id: existingShopCustomer._id,
                    fullName: existingShopCustomer.fullName,
                    role: existingShopCustomer.role
                }
            });
        }

        const existingMembership = account
            ? await ShopMembership.findOne({
                account_id: account._id,
                shop_id: targetShop._id
            }).session(session)
            : null;

        if (existingMembership) {
            await session.abortTransaction();
            return res.status(400).json({
                error: 'This account is already registered in this shop.'
            });
        }

        const { legacyUser: newCustomer, membership } = await createMembershipArtifacts({
            account,
            shopId: targetShop._id,
            role: 'Customer',
            fullName,
            phone: value.phone || '',
            passwordHash: hashedPassword,
            session
        });

        await OTP.deleteOne({ email: cleanEmail }).session(session);

        await session.commitTransaction();

        const token = signSessionToken({ account, membership, user: newCustomer });

        res.cookie('token', token, getCookieOptions());

        res.status(201).json({
            success: true,
            user: {
                id: newCustomer._id,
                fullName: newCustomer.fullName,
                role: newCustomer.role
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Register Customer Error:', err);

        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(409).json({
                error: 'Customer email uniqueness is still using a legacy global index. Restart the backend so the tenant-scoped email index migration can run, then try again.',
                dev_details: err.message
            });
        }

        res.status(500).json({
            error: 'Registration failed.',
            dev_details: err.message
        });
    } finally {
        session.endSession();
    }
};

exports.login = async (req, res) => {
    try {
        const { error, value } = loginUserSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: error.details[0].message
            });
        }

        const { email, password, subdomain } = value;
        const cleanEmail = normalizeEmail(email);

        let account = await Account.findOne({ email: cleanEmail });

        if (!account) {
            let legacyShop = null;
            if (subdomain) {
                legacyShop = await Shop.findOne({ subdomain }).select('_id');
            }

            const legacyUsers = await User.find({
                email: cleanEmail,
                ...(legacyShop ? { shop_id: legacyShop._id } : {})
            });

            if (legacyUsers.length > 1) {
                return res.status(409).json({
                    error: 'Multiple legacy users found. Please login from the specific shop.'
                });
            }

            const legacyUser = legacyUsers[0];
            if (!legacyUser) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            const isLegacyMatch = await bcrypt.compare(password, legacyUser.password);
            if (!isLegacyMatch) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            account = await createAccountForLegacyUser(legacyUser);
            await createMembershipForLegacyUser(legacyUser, account);
        }

        if (account.status !== 'Active') {
            return res.status(403).json({
                error: 'Account is suspended'
            });
        }

        const isMatch = await bcrypt.compare(password, account.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        if (account.platformRole === 'SuperAdmin' && !subdomain) {
            let superUser = await User.findOne({
                account_id: account._id,
                role: 'SuperAdmin'
            });

            if (!superUser) {
                superUser = await User.findOne({
                    email: cleanEmail,
                    role: 'SuperAdmin'
                });
            }

            if (!superUser) {
                return res.status(403).json({ error: 'Super admin user record is missing' });
            }

            const token = signSessionToken({ account, membership: null, user: superUser });

            res.cookie('token', token, getCookieOptions());

            return res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    id: superUser._id,
                    fullName: superUser.fullName,
                    role: superUser.role,
                    shopId: null,
                    email: superUser.email
                }
            });
        }

        let shop = null;

        if (subdomain) {
            shop = await Shop.findOne({ subdomain }).select('_id shopName subdomain isActive approvalStatus');
            if (!shop) return res.status(404).json({ error: 'Shop not found' });
        }

        let memberships = await ShopMembership.find({
            account_id: account._id,
            status: 'Active',
            ...(shop ? { shop_id: shop._id } : {})
        }).populate('legacyUser_id').populate('shop_id', 'shopName subdomain isActive approvalStatus');

        memberships = memberships.filter(item => {
            const user = item.legacyUser_id;
            const memberShop = item.shop_id;
            return user &&
                user.status === 'Active' &&
                memberShop?.isActive !== false &&
                memberShop?.approvalStatus !== 'Suspended';
        });

        if (memberships.length === 0) {
            return res.status(401).json({ error: 'No active membership found for this account.' });
        }

        if (memberships.length > 1 && !shop) {
            const adminMemberships = memberships.filter(item => {
                return ['VendorAdmin', 'VendorStaff'].includes(item.role);
            });

            if (adminMemberships.length === 1) {
                memberships = adminMemberships;
            } else {
                return res.status(409).json({
                    error: 'Multiple shop memberships found. Please login from the specific shop.'
                });
            }
        }

        const membership = memberships[0];
        const user = membership.legacyUser_id;
        const userShop = membership.shop_id;
        const token = signSessionToken({ account, membership, user });

        res.cookie('token', token, getCookieOptions());

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                role: user.role,
                shopId: user.shop_id,
                email: user.email,
                subdomain: userShop?.subdomain,
                shopName: userShop?.shopName
            }
        });

    } catch (err) {
        console.error('Login Error:', err);

        res.status(500).json({
            error: 'Login failed'
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(200).json({
                success: true,
                authenticated: false,
                user: null
            });
        }

        const user = await User.findById(userId)
            .select('-password')
            .lean();

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        if (user.shop_id) {
            const shop = await Shop.findById(user.shop_id)
                .select('shopName subdomain')
                .lean();

            if (shop) {
                user.shopName = shop.shopName;
                user.subdomain = shop.subdomain;
            }
        }

        user.accountId = req.user?.accountId || user.account_id;
        user.membershipId = req.user?.membershipId || user.membership_id;

        res.status(200).json({
            success: true,
            authenticated: true,
            user
        });

    } catch (err) {
        console.error('GetMe Error:', err);

        res.status(500).json({
            error: 'Error fetching user session'
        });
    }
};

exports.logout = (req, res) => {
    const cookieOptions = {
        ...getCookieOptions(),
        expires: new Date(0)
    };
    res.cookie('token', 'none', cookieOptions);

    res.status(200).json({
        message: 'Logged out successfully'
    });
};
