const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const {
    getStockMovement,
    getTopProducts,
    getLowStock,
    getStockAdjustments,
    getRevenueAnalytics
} = require('../controllers/inventory');


// 🔐 Apply middleware globally (cleaner)
router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));


// 📊 Routes
router.get('/movement', getStockMovement);
router.get('/top-products', getTopProducts);
router.get('/low-stock', getLowStock);
router.get('/adjustments', getStockAdjustments);
router.get('/revenue', getRevenueAnalytics);


module.exports = router;