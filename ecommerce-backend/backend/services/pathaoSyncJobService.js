const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { getPathaoToken, createPathaoOrder } = require('./pathaoService');

const buildPathaoPayload = ({ order, shop, payload = {} }) => ({
    store_id: shop.pathaoStoreId,
    merchant_order_id: order._id.toString(),
    recipient_name: payload.recipient_name || order.shipping?.address?.fullName,
    recipient_phone: payload.recipient_phone || order.shipping?.address?.phone,
    recipient_address: payload.recipient_address || order.shipping?.address?.addressLine,
    delivery_type: 48,
    item_type: 2,
    special_instruction: payload.special_instruction || '',
    item_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    item_weight: payload.item_weight || '0.5',
    amount_to_collect: payload.amount_to_collect !== undefined
        ? payload.amount_to_collect
        : (order.payment?.method === 'COD' ? order.pricing?.total : 0)
});

const processPathaoSyncJob = async (job) => {
    if (job.name !== 'pathao.sync_order') {
        throw new Error(`Unsupported courier job: ${job.name}`);
    }

    const order = await Order.findOne({
        _id: job.payload?.orderId,
        shop_id: job.shop_id,
        isDeleted: false
    });

    if (!order) throw new Error('Order not found for Pathao sync');
    if (order.isPathaoSynced) return;

    const shop = await Shop.findById(job.shop_id);
    if (!shop) throw new Error('Shop not found for Pathao sync');
    if (!shop.pathaoStoreId) throw new Error('Pathao store location is not configured');

    order.pathaoSyncStatus = 'syncing';
    order.pathaoLastError = '';
    await order.save();

    try {
        const customCreds = shop.pathaoCredentials && shop.pathaoCredentials.client_id ? shop.pathaoCredentials : null;
        const token = await getPathaoToken(customCreds);
        const isLive = customCreds ? customCreds.isLive : false;
        const pathaoPayload = buildPathaoPayload({ order, shop, payload: job.payload?.request || {} });
        const pathaoRes = await createPathaoOrder(token, pathaoPayload, isLive);

        if (pathaoRes.type !== 'success') {
            throw new Error('Pathao sync failed');
        }

        order.pathaoConsignmentId = pathaoRes.data.consignment_id;
        order.isPathaoSynced = true;
        order.pathaoSyncStatus = 'synced';
        order.pathaoLastError = '';
        if (order.status === 'Pending') order.status = 'Confirmed';
        await order.save();
    } catch (error) {
        order.pathaoSyncStatus = 'failed';
        order.pathaoLastError = String(error.message || error).slice(0, 1000);
        await order.save();
        throw error;
    }
};

module.exports = {
    processPathaoSyncJob
};
