const express = require('express');
const router = express.Router();
// ✨ Import the new function
const { getPublicShopDetails, getPublicProduct,createPublicOrder,getMyOrders,trackPublicOrder } = require('../controllers/publicController');
const { protect } = require('../middlewares/auth'); // Import your auth middleware
router.get('/shop/:subdomain', getPublicShopDetails);

// ✨ Add the new route
router.get('/products/:id', getPublicProduct);
// Add this line to your public routes
router.get('/track-order/:orderId', trackPublicOrder);
router.post('/orders', createPublicOrder);
router.get('/my-orders', protect,getMyOrders);
module.exports = router;