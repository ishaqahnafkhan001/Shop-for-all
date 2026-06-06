const Account = require('../models/Account');
const User = require('../models/User');
const ShopMembership = require('../models/ShopMembership');
const CustomerProfile = require('../models/CustomerProfile');
const StaffPermission = require('../models/StaffPermission');

const DEFAULT_PERMISSIONS = {
    products: true,
    orders: true,
    customers: false,
    promotions: false,
    analytics: false,
    storeBuilder: false,
    settings: false,
    staff: false
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const createMembershipArtifacts = async ({
                                             account,
                                             shopId,
                                             role,
                                             fullName,
                                             phone = '',
                                             passwordHash,
                                             permissions,
                                             session
                                         }) => {
    const existingMembership = await ShopMembership.findOne({
        account_id: account._id,
        shop_id: shopId
    }).session(session || null);

    if (existingMembership) {
        throw new Error('This account is already registered in this shop.');
    }

    const [legacyUser] = await User.create([{
        account_id: account._id,
        fullName,
        email: account.email,
        phone,
        password: passwordHash,
        role,
        shop_id: shopId,
        permissions: permissions || DEFAULT_PERMISSIONS
    }], { session });

    const [membership] = await ShopMembership.create([{
        account_id: account._id,
        shop_id: shopId,
        role,
        legacyUser_id: legacyUser._id
    }], { session });

    legacyUser.membership_id = membership._id;
    await legacyUser.save({ session });

    if (role === 'Customer') {
        await CustomerProfile.create([{
            account_id: account._id,
            membership_id: membership._id,
            shop_id: shopId,
            legacyUser_id: legacyUser._id,
            fullName,
            phone
        }], { session });
    }

    if (role === 'VendorStaff') {
        await StaffPermission.create([{
            account_id: account._id,
            membership_id: membership._id,
            shop_id: shopId,
            legacyUser_id: legacyUser._id,
            permissions: permissions || DEFAULT_PERMISSIONS
        }], { session });
    }

    return { legacyUser, membership };
};

const createAccountForLegacyUser = async (legacyUser, session) => {
    const [account] = await Account.create([{
        email: legacyUser.email,
        passwordHash: legacyUser.password,
        fullName: legacyUser.fullName,
        phone: legacyUser.phone || '',
        status: legacyUser.status || 'Active',
        platformRole: legacyUser.role === 'SuperAdmin' ? 'SuperAdmin' : 'None'
    }], { session });

    legacyUser.account_id = account._id;
    await legacyUser.save({ session });

    return account;
};

const createMembershipForLegacyUser = async (legacyUser, account, session) => {
    if (legacyUser.role === 'SuperAdmin' || !legacyUser.shop_id) return null;

    const [membership] = await ShopMembership.create([{
        account_id: account._id,
        shop_id: legacyUser.shop_id,
        role: legacyUser.role,
        status: legacyUser.status || 'Active',
        legacyUser_id: legacyUser._id
    }], { session });

    legacyUser.membership_id = membership._id;
    await legacyUser.save({ session });

    if (legacyUser.role === 'Customer') {
        await CustomerProfile.create([{
            account_id: account._id,
            membership_id: membership._id,
            shop_id: legacyUser.shop_id,
            legacyUser_id: legacyUser._id,
            fullName: legacyUser.fullName,
            phone: legacyUser.phone || ''
        }], { session });
    }

    if (legacyUser.role === 'VendorStaff') {
        await StaffPermission.create([{
            account_id: account._id,
            membership_id: membership._id,
            shop_id: legacyUser.shop_id,
            legacyUser_id: legacyUser._id,
            permissions: legacyUser.permissions || DEFAULT_PERMISSIONS
        }], { session });
    }

    return membership;
};

module.exports = {
    DEFAULT_PERMISSIONS,
    normalizeEmail,
    createMembershipArtifacts,
    createAccountForLegacyUser,
    createMembershipForLegacyUser
};
