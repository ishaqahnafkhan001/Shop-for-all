const express = require('express');
const router = express.Router();
// ✨ Import the new function
const { getPublicShopDetails, getPublicProduct,createPublicOrder } = require('../controllers/publicController');

router.get('/shop/:subdomain', getPublicShopDetails);

// ✨ Add the new route
router.get('/products/:id', getPublicProduct);

router.post('/orders', createPublicOrder);

module.exports = router;