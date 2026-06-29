const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { processPathaoSyncJob } = require('./pathaoSyncJobService');
const { createRedxParcel } = require('./redx/redxService');

const processRedxCreateParcelJob = async (job) => {
    const order = await Order.findOne({
        _id: job.payload?.orderId,
        shop_id: job.shop_id,
        isDeleted: false
    });

    if (!order) throw new Error('Order not found for RedX parcel creation');
    if (order.courierShipment?.provider === 'redx' && order.courierShipment?.trackingId) return;
    if (order.isPathaoSynced || order.pathaoConsignmentId) {
        throw new Error('Order already has a Pathao shipment');
    }

    const shop = await Shop.findById(job.shop_id);
    if (!shop) throw new Error('Shop not found for RedX parcel creation');

    order.shippingProvider = 'redx';
    order.courierShipment = {
        ...(order.courierShipment || {}),
        provider: 'redx',
        status: 'syncing',
        trackingId: '',
        lastError: '',
        lastSyncedAt: new Date()
    };
    await order.save();

    try {
        const result = await createRedxParcel({
            shop,
            order,
            shipmentInput: job.payload?.shipmentInput || {}
        });

        order.shippingProvider = 'redx';
        order.shipping.courier = 'RedX';
        order.shipping.trackingId = result.trackingId;
        order.courierShipment = {
            provider: 'redx',
            trackingId: result.trackingId,
            status: 'synced',
            charge: Number(result.rawResponse?.charge || 0),
            createdAt: new Date(),
            lastSyncedAt: new Date(),
            lastError: '',
            rawResponse: result.rawResponse
        };
        if (order.status === 'Pending') order.status = 'Confirmed';
        await order.save();
    } catch (error) {
        order.shippingProvider = 'redx';
        order.courierShipment = {
            ...(order.courierShipment || {}),
            provider: 'redx',
            status: 'failed',
            lastError: String(error.message || error).slice(0, 1000),
            lastSyncedAt: new Date()
        };
        await order.save();
        throw error;
    }
};

const processCourierJob = async (job) => {
    if (job.name === 'pathao.sync_order') {
        return processPathaoSyncJob(job);
    }

    if (job.name === 'courier.create_parcel' && job.payload?.provider === 'redx') {
        return processRedxCreateParcelJob(job);
    }

    throw new Error(`Unsupported courier job: ${job.name}`);
};

module.exports = {
    processCourierJob,
    processRedxCreateParcelJob
};
