const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requirePermission } = require('../middlewares/permission');
const { requireShopFeature } = require('../middlewares/featureGate');

const {
    updateStock,
    getInventoryLogs,
    getStockMovement,
    getTopProducts,
    getLowStock,
    getStockAdjustments,
    getRevenueOverview,
} = require('../controllers/inventory');

const { getRevenueAnalytics } = require('../controllers/orderController');

// 🔐 Apply middleware globally — do NOT repeat protect/authorize on individual routes below
router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));


// 📊 Routes
router.patch('/stock', blockVerificationSuspendedShop, requirePermission('inventoryManage'), updateStock);          // FIX: was defined in controller but never registered
router.get('/logs', requirePermission('inventoryRead'), getInventoryLogs);     // FIX: was defined in controller but never registered
router.get('/movement', requirePermission('inventoryRead'), getStockMovement);
router.get('/top-products', requirePermission('inventoryRead'), getTopProducts);       // FIX: removed redundant per-route protect()
router.get('/low-stock', requirePermission('inventoryRead'), requireShopFeature('lowStockAlerts'), getLowStock);
router.get('/adjustments', requirePermission('inventoryRead'), getStockAdjustments);
router.get('/revenue', requirePermission('analytics'), getRevenueOverview);   // FIX: removed redundant per-route protect(); use simple overview here
router.get('/revenue/analytics', requirePermission('analytics'), getRevenueAnalytics); // detailed month/year breakdown kept as separate endpoint


module.exports = router;
