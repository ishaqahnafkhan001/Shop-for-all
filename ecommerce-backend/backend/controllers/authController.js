const Shop = require('../models/Shop');
const User = require('../models/User');
const Account = require('../models/Account');
const ShopMembership = require('../models/ShopMembership');
const VendorVerification = require('../models/VendorVerification');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../services/mail/mailService');

const { shopRegistrationSchema } = require('../validations/shopValidation');
const {
    loginUserSchema,
    registerCustomerSchema,
    forgotPasswordSchema,
    verifyResetOtpSchema,
    resetPasswordSchema,
    updatePasswordSchema
} = require('../validations/userValidation');
const {
    normalizeEmail,
    createMembershipArtifacts,
    createAccountForLegacyUser,
    createMembershipForLegacyUser
} = require('../services/identityService');
const {
    GENERIC_FORGOT_RESPONSE,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword
} = require('../services/passwordResetService');
const {
    createOrReplaceRegistrationOtp,
    consumeRegistrationOtp
} = require('../services/registrationOtpService');
const { notifyCustomerRegistered } = require('../services/shopEventNotificationService');
const { getDefaultDeadline, isVerificationSuspension } = require('../services/vendorVerificationService');
const { getShopFeatureFlags } = require('../services/shops/featureAccessService');
const { createTrialForShop, isBillingSuspension } = require('../services/billing/subscriptionService');
const { buildDefaultPolicies } = require('../services/policies/defaultPolicyTemplates');
const {
    validateSubdomain,
    checkSubdomainAvailability
} = require('../services/subdomainAvailabilityService');
const {
    normalizeCustomDomain,
    getHostnameFromHostHeader,
    getPlatformSubdomainFromHostname,
    isPlatformRootHost,
    isValidCustomDomain,
    buildVerifiedCustomDomainQuery
} = require('../utils/domainUtils');

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

        // Production storefronts can be on tenant/custom domains while the API
        // is on api.scaleup.codes, so the session cookie must survive cross-site
        // XHR refreshes. Local HTTP dev cannot use SameSite=None because it
        // requires Secure.
        sameSite: isProduction ? 'none' : 'lax',
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

const getSessionShopPayload = async (shopOrId) => {
    if (!shopOrId) return { shop: null, effectiveFeatures: {} };

    const shop = typeof shopOrId === 'object' && shopOrId._id
        ? shopOrId
        : await Shop.findById(shopOrId)
            .select('shopName subdomain plan featureFlags isActive approvalStatus suspensionReason')
            .lean();

    if (!shop) return { shop: null, effectiveFeatures: {} };

    const effectiveFeatures = await getShopFeatureFlags(shop);
    return {
        shop: {
            id: shop._id,
            _id: shop._id,
            shopName: shop.shopName,
            subdomain: shop.subdomain
        },
        effectiveFeatures
    };
};

const extractSubdomainFromHost = (host = '') => {
    const hostname = getHostnameFromHostHeader(host);
    const platformSubdomain = getPlatformSubdomainFromHostname(hostname);
    if (platformSubdomain) return platformSubdomain;
    if (isPlatformRootHost(hostname)) return '';
    return isValidCustomDomain(hostname) ? normalizeCustomDomain(hostname) : '';
};

const extractSubdomainFromUrl = (value = '') => {
    try {
        return extractSubdomainFromHost(new URL(value).host);
    } catch {
        return '';
    }
};

const getResetPayload = (req) => ({
    ...req.body,
    subdomain: req.body?.subdomain ||
        req.get('x-shop-subdomain') ||
        req.get('x-storefront-host') ||
        extractSubdomainFromUrl(req.get('origin')) ||
        extractSubdomainFromUrl(req.get('referer'))
});

const findShopByTenantIdentifier = (identifier, projection = '_id', options = {}) => {
    const cleanIdentifier = normalizeCustomDomain(identifier);
    if (!cleanIdentifier) return null;

    const query = cleanIdentifier.includes('.')
        ? buildVerifiedCustomDomainQuery(cleanIdentifier)
        : { subdomain: cleanIdentifier };

    const shopQuery = Shop.findOne(query).select(projection);
    if (options.session) shopQuery.session(options.session);
    return shopQuery;
};

exports.checkSubdomain = async (req, res) => {
    try {
        const result = await checkSubdomainAvailability(req.query.subdomain);

        if (result.valid === false || result.success === false) {
            return res.status(400).json({
                success: false,
                available: false,
                code: result.code || 'INVALID_SUBDOMAIN',
                normalizedSubdomain: result.normalizedSubdomain || '',
                message: result.message || 'Invalid store URL.'
            });
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error('Check subdomain error:', err);
        return res.status(500).json({
            success: false,
            available: false,
            error: 'Failed to check store URL availability.'
        });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        const otp = await createOrReplaceRegistrationOtp({ email });

        await sendMail({
            type: 'reset',
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
            otp,
            selectedPlanSlug,
            selectedPlanId
        } = value;
        const cleanEmail = normalizeEmail(email);
        const subdomainValidation = validateSubdomain(subdomain);
        if (!subdomainValidation.valid) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                code: subdomainValidation.code,
                error: subdomainValidation.message
            });
        }

        const otpResult = await consumeRegistrationOtp({
            email: cleanEmail,
            otp,
            session
        });

        if (!otpResult.success) {
            await session.abortTransaction();
            return res.status(400).json({
                error: otpResult.error
            });
        }

        const existingShop = await Shop.findOne({ subdomain }).session(session);

        if (existingShop) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                code: 'SUBDOMAIN_TAKEN',
                error: 'This store URL was just taken. Please choose another one.'
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
            subdomain,
            theme: {
                policies: buildDefaultPolicies({ storeName: shopName })
            }
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

        await VendorVerification.create([{
            shop_id: newShop._id,
            owner_id: account._id,
            ownerModel: 'Account',
            status: 'not_submitted',
            verificationDeadline: newShop.verification?.deadline || getDefaultDeadline(newShop)
        }], { session });

        await createTrialForShop(newShop, {
            session,
            selectedPlanSlug: selectedPlanSlug || 'starter',
            intendedPlanId: selectedPlanId || null
        });

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

        if (err.code === 11000 && err.keyPattern?.subdomain) {
            return res.status(409).json({
                success: false,
                code: 'SUBDOMAIN_TAKEN',
                error: 'This store URL was just taken. Please choose another one.'
            });
        }

        res.status(500).json({
            error: 'Registration failed'
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

        const otpResult = await consumeRegistrationOtp({
            email: cleanEmail,
            otp,
            session
        });

        if (!otpResult.success) {
            await session.abortTransaction();
            return res.status(400).json({
                error: otpResult.error
            });
        }

        const targetShop = await findShopByTenantIdentifier(subdomain, '_id shopName subdomain', { session });

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

            await session.commitTransaction();

            notifyCustomerRegistered({
                shop_id: targetShop._id,
                customer: existingShopCustomer
            });

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

        await session.commitTransaction();

        notifyCustomerRegistered({
            shop_id: targetShop._id,
            customer: newCustomer
        });

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
                error: 'This email is already registered for this store.'
            });
        }

        res.status(500).json({
            error: 'Registration failed.'
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
                legacyShop = await findShopByTenantIdentifier(subdomain, '_id');
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
            shop = await findShopByTenantIdentifier(subdomain, '_id shopName subdomain isActive approvalStatus suspensionReason plan featureFlags');
            if (!shop) return res.status(404).json({ error: 'Shop not found' });
        }

        let memberships = await ShopMembership.find({
            account_id: account._id,
            status: 'Active',
            ...(shop ? { shop_id: shop._id } : {})
        }).populate('legacyUser_id').populate('shop_id', 'shopName subdomain isActive approvalStatus suspensionReason plan featureFlags');

        memberships = memberships.filter(item => {
            const user = item.legacyUser_id;
            const memberShop = item.shop_id;
            const isVendorRole = ['VendorAdmin', 'VendorStaff'].includes(user?.role);
            const canRecover = isVendorRole && (
                isVerificationSuspension(memberShop) ||
                isBillingSuspension(memberShop)
            );
            return user &&
                user.status === 'Active' &&
                (
                    (
                        memberShop?.isActive !== false &&
                        memberShop?.approvalStatus !== 'Suspended'
                    ) ||
                    canRecover
                );
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
        const { shop: sessionShop, effectiveFeatures } = await getSessionShopPayload(userShop);

        res.cookie('token', token, getCookieOptions());

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                fullName: user.fullName,
                role: user.role,
                shopId: user.shop_id,
                email: user.email,
                subdomain: userShop?.subdomain,
                shopName: userShop?.shopName,
                shop: sessionShop,
                effectiveFeatures
            }
        });

    } catch (err) {
        console.error('Login Error:', err);

        res.status(500).json({
            error: 'Login failed'
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { error, value } = forgotPasswordSchema.validate(getResetPayload(req));

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const result = await requestPasswordReset(value);

        res.status(200).json({
            success: true,
            message: result.message || GENERIC_FORGOT_RESPONSE
        });
    } catch (err) {
        console.error('Forgot Password Error:', err);

        res.status(200).json({
            success: true,
            message: GENERIC_FORGOT_RESPONSE
        });
    }
};

exports.verifyResetOtp = async (req, res) => {
    try {
        const { error, value } = verifyResetOtpSchema.validate(getResetPayload(req));

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const result = await verifyResetOtp(value);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(200).json({
            success: true,
            message: result.message,
            resetToken: result.resetToken
        });
    } catch (err) {
        console.error('Verify Reset OTP Error:', err);

        res.status(400).json({
            error: 'Invalid or expired verification code.'
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { error, value } = resetPasswordSchema.validate(getResetPayload(req));

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const result = await resetPassword(value);

        if (!result.success) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (err) {
        console.error('Reset Password Error:', err);

        res.status(500).json({
            error: 'Password reset failed.'
        });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { error, value } = updatePasswordSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const userId = req.user?._id || req.user?.id;
        const accountId = req.user?.accountId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authorized. Please login again.' });
        }

        const user = await User.findById(userId).select('password account_id status');
        if (!user || user.status !== 'Active') {
            return res.status(401).json({ error: 'Not authorized. Please login again.' });
        }

        const account = accountId || user.account_id
            ? await Account.findById(accountId || user.account_id).select('passwordHash status')
            : null;

        if (account && account.status !== 'Active') {
            return res.status(403).json({ error: 'Account is suspended' });
        }

        const currentHash = account?.passwordHash || user.password;
        const passwordMatches = await bcrypt.compare(value.currentPassword, currentHash);

        if (!passwordMatches) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(value.newPassword, salt);

        if (account) {
            await Account.updateOne({ _id: account._id }, { $set: { passwordHash } });
            await User.updateMany({ account_id: account._id }, { $set: { password: passwordHash } });
        } else {
            await User.updateOne({ _id: user._id }, { $set: { password: passwordHash } });
        }

        console.info('[Auth] Password updated', {
            userId: String(user._id),
            accountId: account ? String(account._id) : null,
            role: req.user?.role
        });

        res.status(200).json({
            success: true,
            message: 'Password updated successfully.'
        });
    } catch (err) {
        console.error('Update Password Error:', err);

        res.status(500).json({
            error: 'Password update failed.'
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const requestedSubdomain = req.query?.subdomain
            ? String(req.query.subdomain).trim().toLowerCase()
            : '';

        if (!userId) {
            return res.status(200).json({
                success: true,
                authenticated: false,
                user: null
            });
        }

        if (requestedSubdomain && req.user?.role !== 'SuperAdmin') {
            const requestedShop = await findShopByTenantIdentifier(requestedSubdomain, '_id subdomain');

            if (!requestedShop || String(requestedShop._id) !== String(req.user.shop_id || req.user.shopId)) {
                return res.status(401).json({
                    error: 'Session does not belong to this shop'
                });
            }
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
                .select('shopName subdomain plan featureFlags isActive approvalStatus suspensionReason')
                .lean();

            if (shop) {
                user.shopName = shop.shopName;
                user.subdomain = shop.subdomain;
                const { shop: sessionShop, effectiveFeatures } = await getSessionShopPayload(shop);
                user.shop = sessionShop;
                user.effectiveFeatures = effectiveFeatures;
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
    delete cookieOptions.maxAge;

    res.clearCookie('token', cookieOptions);

    res.status(200).json({
        message: 'Logged out successfully'
    });
};
