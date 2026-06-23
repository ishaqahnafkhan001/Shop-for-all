const Order = require('../../models/Order');

const getCustomerOrders = async ({ customerId, shopId }) => (
    Order.find({
        customer: customerId,
        shop_id: shopId
    }).sort({ createdAt: -1 })
);

const getCustomerOrderById = async ({ orderId, customerId, shopId }) => (
    Order.findOne({
        _id: orderId,
        customer: customerId,
        shop_id: shopId
    })
);

const getShopOrdersPage = async ({ shopId, page = 1, limit = 25 }) => {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const skip = (safePage - 1) * safeLimit;
    const query = { shop_id: shopId, isDeleted: false };

    const [orders, total] = await Promise.all([
        Order.find(query)
            .select('customer items.title items.productId pricing payment shipping status source isPathaoSynced pathaoConsignmentId createdAt updatedAt')
            .populate('customer', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Order.countDocuments(query)
    ]);

    return {
        orders,
        pagination: {
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit)
        }
    };
};

module.exports = {
    getCustomerOrders,
    getCustomerOrderById,
    getShopOrdersPage
};
