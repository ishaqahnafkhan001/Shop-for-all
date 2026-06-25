const User = require('../models/User');
const Account = require('../models/Account');
const ShopMembership = require('../models/ShopMembership');
const StaffPermission = require('../models/StaffPermission');
const bcrypt = require('bcryptjs');
const { createUserSchema } = require('../validations/userValidation');
const {
    normalizeEmail,
    createMembershipArtifacts
} = require('../services/identityService');
const { logAudit } = require('../services/auditLogService');
const {
    sanitizeStaffPermissions,
    getStaffCapacity
} = require('../services/staff/staffCapacityService');


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
        // Find users linked to this specific shop with the 'Customer' role
        const customers = await User.find({
            shop_id: req.user.shopId,
            role: 'Customer'
        })
            .select('-password') // Never send passwords to the frontend!
            .sort({ createdAt: -1 }); // Newest customers first

        res.status(200).json(customers);
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
    try {
        const { error, value } = createUserSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });
        if (value.role !== 'VendorStaff') {
            return res.status(400).json({
                success: false,
                error: 'Only staff accounts can be created from staff management.'
            });
        }

        const currentShopId = req.user.shopId;
        const cleanEmail = normalizeEmail(value.email);

        const existingMembership = await User.findOne({
            email: cleanEmail,
            shop_id: currentShopId
        });

        if (existingMembership) {
            return res.status(400).json({ error: "Email already registered in this shop" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(value.password, salt);

        let account = await Account.findOne({ email: cleanEmail });

        if (account) {
            const passwordMatches = await bcrypt.compare(value.password, account.passwordHash);
            if (!passwordMatches) {
                return res.status(409).json({
                    error: 'This email belongs to an existing account. Use the account password to add it to this shop.'
                });
            }
        } else {
            account = await Account.create({
                email: cleanEmail,
                fullName: value.fullName,
                passwordHash: hashedPassword
            });
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
            session: null
        });

        await logAudit({
            req,
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
    try {
        const user = await User.findOne({
            _id: req.params.id,
            shop_id: req.user.shopId,
            role: 'VendorStaff'
        });

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
                    return res.status(403).json({
                        success: false,
                        code: 'STAFF_LIMIT_REACHED',
                        error: capacity.message || 'You have reached your staff limit for this plan.',
                        limit: capacity.staffLimit,
                        current: capacity.usedStaffCount,
                        remainingStaffSlots: capacity.remainingStaffSlots
                    });
                }
            }
            user.status = req.body.status;
            if (user.membership_id) {
                await ShopMembership.findByIdAndUpdate(user.membership_id, {
                    status: req.body.status
                });
            }
        }

        await user.save();

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
                { upsert: true, new: true }
            );
        }

        await logAudit({
            req,
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
        res.status(500).json({ error: 'Failed to update staff member' });
    }
};

exports.updateShopUser = updateShopUser;
exports.updateShopUserPermissions = updateShopUser;

exports.removeShopStaff = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            shop_id: req.user.shopId,
            role: 'VendorStaff'
        });

        if (!user) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        if (String(user._id) === String(req.user._id || req.user.id)) {
            return res.status(400).json({ error: 'You cannot remove yourself from staff management.' });
        }

        const previousStatus = user.status;
        user.status = 'Suspended';
        await user.save();

        if (user.membership_id) {
            await ShopMembership.findByIdAndUpdate(user.membership_id, {
                status: 'Suspended'
            });
        }

        await logAudit({
            req,
            shop_id: req.user.shopId,
            action: 'staff.removed',
            entityType: 'User',
            entityId: user._id,
            entityLabel: user.fullName || user.email,
            severity: 'warning',
            before: { status: previousStatus },
            after: { status: user.status }
        });

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
    }
};
