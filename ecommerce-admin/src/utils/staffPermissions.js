export const STAFF_OPERATIONAL_PERMISSIONS = [
    'overview',
    'products',
    'catalogTools',
    'orders',
    'returns',
    'customers',
    'privacyRequests',
    'promotions',
    'notifications',
    'shipping',
    'analytics',
    'growthCenter',
    'storeBuilder',
    'settings',
    'activityLogs',
    'collectionsAi',
    'productsSchedule',
    'salesManage',
    'bannersManage',
    'inventoryAlertsManage',
    'inventoryRead',
    'inventoryManage',
    'growthRead',
    'purchaseOrdersRead',
    'purchaseOrdersManage',
    'purchaseOrdersReceive'
];

export const STAFF_PERMISSION_LABELS = {
    overview: 'Overview',
    products: 'Products',
    catalogTools: 'Catalog tools',
    orders: 'Orders',
    returns: 'Returns',
    customers: 'Customers',
    privacyRequests: 'Privacy requests',
    promotions: 'Promotions',
    notifications: 'Notifications',
    shipping: 'Shipping',
    analytics: 'Analytics',
    growthCenter: 'Growth Center',
    storeBuilder: 'Store Builder',
    settings: 'Settings',
    activityLogs: 'Activity logs',
    collectionsAi: 'Collection AI',
    productsSchedule: 'Schedule products',
    salesManage: 'Scheduled sales',
    bannersManage: 'Launch banners',
    inventoryAlertsManage: 'Inventory alerts',
    inventoryRead: 'Inventory reports',
    inventoryManage: 'Stock adjustments',
    growthRead: 'Growth insights',
    purchaseOrdersRead: 'Purchase orders',
    purchaseOrdersManage: 'Manage purchase orders',
    purchaseOrdersReceive: 'Receive stock'
};

export const DEFAULT_STAFF_PERMISSIONS = STAFF_OPERATIONAL_PERMISSIONS.reduce((acc, key) => {
    acc[key] = ['overview', 'products', 'orders'].includes(key);
    return acc;
}, {});

export const hasStaffPermission = (user, permission) => {
    if (!permission) return true;
    if (['SuperAdmin', 'VendorAdmin'].includes(user?.role)) return true;
    if (user?.role !== 'VendorStaff') return false;
    return user?.permissions?.[permission] === true;
};
