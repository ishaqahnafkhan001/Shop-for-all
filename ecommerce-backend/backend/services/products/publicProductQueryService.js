const mongoose = require('mongoose');

const buildPublicProductQuery = (shopId, extra = {}) => ({
    shop_id: mongoose.Types.ObjectId.isValid(shopId) ? new mongoose.Types.ObjectId(shopId) : shopId,
    isDeleted: false,
    isActive: true,
    status: 'Published',
    ...extra
});

module.exports = { buildPublicProductQuery };
