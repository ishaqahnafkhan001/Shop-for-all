const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

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
router.patch('/stock',         updateStock);          // FIX: was defined in controller but never registered
router.get('/logs',            getInventoryLogs);     // FIX: was defined in controller but never registered
router.get('/movement',        getStockMovement);
router.get('/top-products',    getTopProducts);       // FIX: removed redundant per-route protect()
router.get('/low-stock',       getLowStock);
router.get('/adjustments',     getStockAdjustments);
router.get('/revenue',         getRevenueOverview);   // FIX: removed redundant per-route protect(); use simple overview here
router.get('/revenue/analytics', getRevenueAnalytics); // detailed month/year breakdown kept as separate endpoint


module.exports = router;