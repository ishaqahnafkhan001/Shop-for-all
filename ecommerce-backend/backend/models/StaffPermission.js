const mongoose = require('mongoose');
const { Schema } = mongoose;

const permissionsSchema = new Schema({
    overview: { type: Boolean, default: false },
    products: { type: Boolean, default: true },
    catalogTools: { type: Boolean, default: false },
    orders: { type: Boolean, default: true },
    returns: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    privacyRequests: { type: Boolean, default: false },
    promotions: { type: Boolean, default: false },
    notifications: { type: Boolean, default: false },
    shipping: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    growthCenter: { type: Boolean, default: false },
    storeBuilder: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
    activityLogs: { type: Boolean, default: false },
    collectionsAi: { type: Boolean, default: false },
    productsSchedule: { type: Boolean, default: false },
    salesManage: { type: Boolean, default: false },
    bannersManage: { type: Boolean, default: false },
    inventoryAlertsManage: { type: Boolean, default: false },
    inventoryRead: { type: Boolean, default: false },
    inventoryManage: { type: Boolean, default: false },
    growthRead: { type: Boolean, default: false },
    purchaseOrdersRead: { type: Boolean, default: false },
    purchaseOrdersManage: { type: Boolean, default: false },
    purchaseOrdersReceive: { type: Boolean, default: false }
}, { _id: false });

const staffPermissionSchema = new Schema({
    account_id: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    membership_id: {
        type: Schema.Types.ObjectId,
        ref: 'ShopMembership',
        required: true,
        unique: true
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    legacyUser_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    permissions: {
        type: permissionsSchema,
        default: () => ({})
    }
}, { timestamps: true });

module.exports = mongoose.model('StaffPermission', staffPermissionSchema);
