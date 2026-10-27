const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const ShopMembership = require('../models/ShopMembership');
const StaffPermission = require('../models/StaffPermission');
const bcrypt = require('bcryptjs');
const { createUserSchema, updateStaffSchema } = require('../validations/userValidation');
const {
    normalizeEmail,
    createMembershipArtifacts
} = require('../services/identityService');
const { logAudit } = require('../services/auditLogService');
const {
    sanitizeStaffPermissions,
    getStaffCapacity
} = require('../services/staff/staffCapacityService');
const { buildPagination } = require('../utils/pagination');
const { reserveQuota, releaseQuotaSafely } = require('../services/billing/planQuotaReservationService');
const { getShopPlanAccess, buildLimitError } = require('../services/billing/planAccessService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');


/**
 * @desc    Toggle a customer's ban status (Active <-> Suspended)
 * @route   PATCH /api/admin/customers/:id/status
 */
exports.toggleCustomerStatus = async (req, res) => {
    try {
        const customerId = req.params.id;
        const shopId = req.user.shop_id || req.user.shopId;

        // 1. Find the user, ensuring they belong to THIS vendor's shop
        const customer = await User.findOne({
            _id: customerId,
            shop_id: shopId,
            role: 'Customer'
        });

        if (!customer) {
            return res.status(404).json({ error: "Customer not found or access denied." });
        }

        // 2. Toggle the status
        const previousStatus = customer.status;
        customer.status = customer.status === 'Active' ? 'Suspended' : 'Active';
        await customer.save();

        if (customer.membership_id) {
            await ShopMembership.findByIdAndUpdate(customer.membership_id, {
                status: customer.status
            });
        }

        await logAudit({
            req,
            shop_id: shopId,
            action: 'customer.status_updated',
            entityType: 'User',
            entityId: customer._id,
            entityLabel: customer.fullName || customer.email,
            severity: customer.status === 'Suspended' ? 'warning' : 'info',
            before: { status: previousStatus },
            after: { status: customer.status }
        });

        res.status(200).json({
            success: true,
            message: `Customer is now ${customer.status}`,
            status: customer.status
        });

    } catch (err) {
        console.error("Error updating customer status:", err);
        res.status(500).json({ error: "Failed to update status." });
    }
};

/**
 * @desc    Get all customers for the logged-in vendor's shop
 * @route   GET /api/admin/customers
 */
exports.getShopCustomers = async (req, res) => {
    try {
        const hasPaginationParams = ['page', 'limit', 'search', 'status'].some(key => req.query[key] !== undefined);
        const shopId = req.tenantId || req.user.shopId;
        const query = {
            shop_id: shopId,
            role: 'Customer'
        };

        if (req.query.status && req.query.status !== 'All') {
            query.status = req.query.status;
        }

        if (req.query.search) {
            const search = String(req.query.search || '').trim();
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex }
            ];
        }

        if (!hasPaginationParams) {
            const customers = await User.find(query)
                .select('_id fullName email phone status createdAt emailVerified marketingEmail.consentedAt marketingEmail.pendingAt marketingEmail.unsubscribedAt marketingEmail.suppressedAt marketingEmail.suppressionReason')
                .sort({ createdAt: -1 });

            return res.status(200).json(customers);
        }

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
        const skip = (page - 1) * limit;

        // Find users linked to this specific shop with the 'Customer' role
        const [customers, total] = await Promise.all([
            User.find(query)
            .select('_id fullName email phone status createdAt emailVerified marketingEmail.consentedAt marketingEmail.pendingAt marketingEmail.unsubscribedAt marketingEmail.suppressedAt marketingEmail.suppressionReason')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: customers,
            pagination: buildPagination({ total, page, limit })
        });
    } catch (err) {
        console.error("Error fetching customers:", err);
        res.status(500).json({ error: "Failed to fetch customers" });
    }
};

/**
 * @desc    Create a new Staff/Customer (Vendor Action)
 * @route   POST /api/admin/users
 */
exports.createShopUser = async (req, res) => {
    let session;
    try {
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        if (value.role !== 'VendorStaff') {
            return res.status(400).json({
                success: false,
                error: 'Only staff accounts can be created from staff management.'
            });
        }

        session = await mongoose.startSession();
        session.startTransaction();
        const currentShopId = req.user.shopId;
        const cleanEmail = normalizeEmail(value.email);

        const existingMembership = await User.findOne({
            email: cleanEmail,
            shop_id: currentShopId
        }).session(session);

        if (existingMembership) {
            return res.status(400).json({ error: "Email already registered in this shop" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(value.password, salt);

        let account = await Account.findOne({ email: cleanEmail }).select('+passwordHash').session(session);

        if (account) {
            const passwordMatches = await bcrypt.compare(value.password, account.passwordHash);
            if (!passwordMatches) {
                return res.status(409).json({
                    error: 'This email belongs to an existing account. Use the account password to add it to this shop.'
                });
            }
        } else {
            [account] = await Account.create([{
                email: cleanEmail,
                fullName: value.fullName,
                passwordHash: hashedPassword
            }], { session });
        }

        const { legacyUser: newUser } = await createMembershipArtifacts({
            account,
            shopId: currentShopId,
            role: value.role,
            fullName: value.fullName,
            phone: value.phone || '',
            staffTitle: value.staffTitle || '',
            staffNote: value.staffNote || '',
            passwordHash: account.passwordHash || hashedPassword,
            permissions: sanitizeStaffPermissions(value.permissions),
            session
        });

        await logAudit({
            req, session, strict: true,
            shop_id: currentShopId,
            action: 'user.created',
            entityType: 'User',
            entityId: newUser._id,
            entityLabel: newUser.fullName || newUser.email,
            after: {
                email: newUser.email,
                role: newUser.role
            }
        });

        await session.commitTransaction();
        res.status(201).json({
            message: `${value.role} created successfully`,
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                phone: newUser.phone,
                staffTitle: newUser.staffTitle,
                staffNote: newUser.staffNote,
                role: newUser.role,
                status: newUser.status,
                permissions: newUser.permissions
            }
        });
    } catch (err) {
        res.status(err.code === 11000 ? 409 : 500).json({ error: err.code === 11000 ? "This account is already registered. Refresh the staff list." : "Failed to create user" });
    } finally {
        if (session?.inTransaction()) await session.abortTransaction();
        await session?.endSession();
    }
};

/**
 * @desc    Get all users for the logged-in vendor's shop
 * @route   GET /api/admin/users
 */
exports.getShopUsers = async (req, res) => {
    try {
        const users = await User.find({ shop_id: req.user.shopId, role: 'VendorStaff' })
            .select('_id fullName email phone staffTitle staffNote role status permissions createdAt updatedAt')
            .sort({ createdAt: -1 });

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

exports.getStaffSummary = async (req, res) => {
    try {
        const summary = await getStaffCapacity(req.user.shopId);
        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (err) {
        console.error('Get staff summary error:', err);
        res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Failed to load staff summary'
        });
    }
};

const updateShopUser = async (req, res) => {
    let quotaReservation = null;
    let session;
    try {
        const validation = updateStaffSchema.validate(req.body);
        if (validation.error) return res.status(400).json({ error: validation.error.details[0].message });
        req.body = validation.value;
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid staff ID.' });
        session = await mongoose.startSession();
        session.startTransaction();
        const user = await User.findOne({
            _id: req.params.id,
            shop_id: req.user.shopId,
            role: 'VendorStaff'
        }).session(session);

        if (!user) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        if (String(user._id) === String(req.user._id || req.user.id)) {
            return res.status(400).json({ error: 'You cannot edit your own staff access here.' });
        }

        const beforeAudit = {
            fullName: user.fullName,
            phone: user.phone,
            staffTitle: user.staffTitle,
            staffNote: user.staffNote,
            status: user.status,
            permissions: user.permissions?.toObject?.() || user.permissions || {}
        };

        if (Object.prototype.hasOwnProperty.call(req.body, 'fullName')) {
            const fullName = String(req.body.fullName || '').trim();
            if (fullName.length < 3 || fullName.length > 50) {
                return res.status(400).json({ error: 'Staff name must be between 3 and 50 characters.' });
            }
            user.fullName = fullName;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
            user.phone = String(req.body.phone || '').trim().slice(0, 40);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'staffTitle')) {
            user.staffTitle = String(req.body.staffTitle || '').trim().slice(0, 80);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'staffNote')) {
            user.staffNote = String(req.body.staffNote || '').trim().slice(0, 500);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'permissions')) {
            user.permissions = sanitizeStaffPermissions(
                req.body.permissions,
                user.permissions?.toObject?.() || user.permissions || {}
            );
        }

        if (req.body.status && ['Active', 'Suspended'].includes(req.body.status)) {
            if (req.body.status === 'Active' && user.status !== 'Active') {
                const capacity = await getStaffCapacity(req.user.shopId);
                if (!capacity.canAddStaff) {
                    const context = await getShopPlanAccess(req.user.shopId);
                    const payload = await buildLimitError(context, 'staffAccounts', capacity.usedStaffCount, capacity.staffLimit);
                    payload.legacyCode = 'STAFF_LIMIT_REACHED';
                    payload.remainingStaffSlots = capacity.remainingStaffSlots;
                    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_REACHED, {
                        req,
                        shopId: req.user.shopId,
                        subscriptionId: context.subscription?._id,
                        planKey: context.planKey,
                        affectedResources: ['staff'],
                        metadata: { resource: 'staff', usage: payload.usage, notifyVendor: false }
                    });
                    return res.status(403).json(payload);
                }
                try {
                    quotaReservation = await reserveQuota({
                        shopId: req.user.shopId,
                        resource: 'staff',
                        requested: 1,
                        limit: capacity.staffLimit,
                        getCommittedUsage: () => User.countDocuments({
                            shop_id: req.user.shopId,
                            role: 'VendorStaff',
                            status: 'Active'
                        })
                    });
                } catch (error) {
                    if (error.code !== 'PLAN_LIMIT_REACHED') throw error;
                    const context = await getShopPlanAccess(req.user.shopId);
                    const payload = await buildLimitError(context, 'staffAccounts', error.usage, capacity.staffLimit);
                    payload.legacyCode = 'STAFF_LIMIT_REACHED';
                    payload.remainingStaffSlots = 0;
                    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_REACHED, {
                        req,
                        shopId: req.user.shopId,
                        subscriptionId: context.subscription?._id,
                        planKey: context.planKey,
                        affectedResources: ['staff'],
                        metadata: { resource: 'staff', usage: payload.usage, notifyVendor: false }
                    });
                    return res.status(403).json(payload);
                }
            }
            user.status = req.body.status;
            if (req.body.status === 'Active') {
                user.planSuspendedAt = null;
                user.planSuspendedFor = '';
            }
            if (user.membership_id) {
                await ShopMembership.findOneAndUpdate({ _id: user.membership_id, shop_id: req.user.shopId }, {
                    $set: {
                        status: req.body.status,
                        ...(req.body.status === 'Active'
                            ? { planSuspendedAt: null, planSuspendedFor: '' }
                            : {})
                    }
                }, { session });
            }
        }

        if (beforeAudit.status === 'Active' && user.status === 'Suspended') user.sessionVersion = Number(user.sessionVersion || 0) + 1;
        await user.save({ session });

        if (Object.prototype.hasOwnProperty.call(req.body, 'permissions') && user.membership_id) {
            await StaffPermission.findOneAndUpdate(
                {
                    membership_id: user.membership_id,
                    shop_id: req.user.shopId
                },
                {
                    $set: {
                        permissions: user.permissions,
                        account_id: user.account_id,
                        legacyUser_id: user._id
                    }
                },
                { upsert: true, new: true, session }
            );
        }

        await logAudit({
            req, session, strict: true,
            shop_id: req.user.shopId,
            action: 'staff.updated',
            entityType: 'User',
            entityId: user._id,
            entityLabel: user.fullName || user.email,
            before: beforeAudit,
            after: {
                fullName: user.fullName,
                phone: user.phone,
                staffTitle: user.staffTitle,
                staffNote: user.staffNote,
                status: user.status,
                permissions: user.permissions?.toObject?.() || user.permissions || {}
            }
        });

        await session.commitTransaction();
        if (beforeAudit.status !== 'Active' && user.status === 'Active') {
            const context = await getShopPlanAccess(req.user.shopId);
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
                req,
                shopId: req.user.shopId,
                subscriptionId: context.subscription?._id,
                planKey: context.planKey,
                affectedResources: ['staff'],
                metadata: { action: 'staff_added', resource: 'staff' }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Staff permissions updated',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                staffTitle: user.staffTitle,
                staffNote: user.staffNote,
                role: user.role,
                status: user.status,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('Update staff error:', err);
        res.status(err.code === 112 ? 409 : 500).json({ error: err.code === 112 ? 'Staff changed in another request. Refresh and retry.' : 'Failed to update staff member' });
    } finally {
        if (session?.inTransaction()) await session.abortTransaction();
        await session?.endSession();
        releaseQuotaSafely(quotaReservation);
    }
};

exports.updateShopUser = updateShopUser;
exports.updateShopUserPermissions = updateShopUser;

exports.removeShopStaff = async (req, res) => {
    let session;
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid staff ID.' });
        session = await mongoose.startSession();
        session.startTransaction();
        const user = await User.findOne({
            _id: req.params.id,
            shop_id: req.user.shopId,
            role: 'VendorStaff'
        }).session(session);

        if (!user) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        if (String(user._id) === String(req.user._id || req.user.id)) {
            return res.status(400).json({ error: 'You cannot remove yourself from staff management.' });
        }

        const previousStatus = user.status;
        user.status = 'Suspended';
        if (previousStatus === 'Active') user.sessionVersion = Number(user.sessionVersion || 0) + 1;
        await user.save({ session });

        if (user.membership_id) {
            await ShopMembership.findOneAndUpdate({ _id: user.membership_id, shop_id: req.user.shopId }, { status: 'Suspended' }, { session });
        }

        await logAudit({
            req, session, strict: true,
            shop_id: req.user.shopId,
            action: 'staff.removed',
            entityType: 'User',
            entityId: user._id,
            entityLabel: user.fullName || user.email,
            severity: 'warning',
            before: { status: previousStatus },
            after: { status: user.status }
        });

        await session.commitTransaction();
        if (previousStatus === 'Active') {
            const context = await getShopPlanAccess(req.user.shopId);
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
                req,
                shopId: req.user.shopId,
                subscriptionId: context.subscription?._id,
                planKey: context.planKey,
                affectedResources: ['staff'],
                metadata: { action: 'staff_removed', resource: 'staff' }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Staff account deactivated',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                staffTitle: user.staffTitle,
                staffNote: user.staffNote,
                role: user.role,
                status: user.status,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('Remove staff error:', err);
        res.status(500).json({ error: 'Failed to remove staff member' });
    } finally {
        if (session?.inTransaction()) await session.abortTransaction();
        await session?.endSession();
    }
};
