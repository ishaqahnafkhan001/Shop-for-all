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
        customer.status = customer.status === 'Active' ? 'Suspended' : 'Active';
        await customer.save();

        if (customer.membership_id) {
            await ShopMembership.findByIdAndUpdate(customer.membership_id, {
                status: customer.status
            });
        }

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
            passwordHash: account.passwordHash || hashedPassword,
            permissions: value.permissions,
            session: null
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

exports.updateShopUserPermissions = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            shop_id: req.user.shopId,
            role: 'VendorStaff'
        });

        if (!user) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        user.permissions = {
            ...(user.permissions?.toObject?.() || user.permissions || {}),
            ...req.body.permissions
        };

        if (user.membership_id) {
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

        if (req.body.status && ['Active', 'Suspended'].includes(req.body.status)) {
            user.status = req.body.status;
            if (user.membership_id) {
                await ShopMembership.findByIdAndUpdate(user.membership_id, {
                    status: req.body.status
                });
            }
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Staff permissions updated',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status,
                permissions: user.permissions
            }
        });
    } catch (err) {
        console.error('Update staff permissions error:', err);
        res.status(500).json({ error: 'Failed to update staff permissions' });
    }
};
