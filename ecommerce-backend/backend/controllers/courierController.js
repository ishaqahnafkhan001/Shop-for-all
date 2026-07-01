const Joi = require('joi');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { enqueueJob, requeueJobs } = require('../services/jobQueueService');
const {
    applyRedxConfigToShop,
    clearRedxConfigFromShop,
    getCourierSummary
} = require('../services/courierConfigService');
const { toLocalBDPhone } = require('../utils/phoneUtils');
const {
    createRedxPickupStore,
    getRedxAreas,
    getRedxParcelInfo,
    getRedxPickupStores,
    trackRedxParcel
} = require('../services/redx/redxService');

const redxConfigSchema = Joi.object({
    token: Joi.string().trim().min(10).max(5000).allow('').optional(),
    pickupStoreId: Joi.string().trim().min(1).max(120).required(),
    pickupStoreName: Joi.string().trim().max(160).allow('').optional(),
    pickupAddress: Joi.string().trim().max(300).allow('').optional(),
    pickupAreaName: Joi.string().trim().max(120).allow('').optional(),
    pickupAreaId: Joi.string().trim().max(120).allow('').optional(),
    enabled: Joi.boolean().optional()
});

const defaultCourierSchema = Joi.object({
    provider: Joi.string().valid('pathao', 'redx', null).required()
});

const shipmentSchema = Joi.object({
    provider: Joi.string().valid('pathao', 'redx').required(),
    retry: Joi.boolean().optional(),
    shipmentInput: Joi.object({
        deliveryArea: Joi.string().trim().max(160).allow('').optional(),
        deliveryAreaId: Joi.string().trim().max(120).allow('').optional(),
        parcelWeight: Joi.alternatives().try(Joi.number().positive(), Joi.string().trim()).optional(),
        instruction: Joi.string().trim().max(500).allow('').optional(),
        isClosedBox: Joi.boolean().optional(),
        declaredValue: Joi.alternatives().try(Joi.number().min(0), Joi.string().trim()).optional(),
        cashCollectionAmount: Joi.alternatives().try(Joi.number().min(0), Joi.string().trim()).optional()
    }).default({})
});

const redxAreaSearchSchema = Joi.object({
    token: Joi.string().trim().min(10).max(5000).allow('').optional(),
    postCode: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().max(20).allow('')).optional(),
    districtName: Joi.string().trim().max(80).allow('').optional()
});

const redxPickupStoreSchema = Joi.object({
    token: Joi.string().trim().min(10).max(5000).allow('').optional(),
    name: Joi.string().trim().min(2).max(120).required(),
    phone: Joi.string().trim().min(11).max(20).required(),
    address: Joi.string().trim().min(5).max(300).required(),
    areaId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().max(30)).required(),
    enabled: Joi.boolean().optional()
});

const getShop = async (shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        const error = new Error('Shop not found');
        error.statusCode = 404;
        throw error;
    }
    return shop;
};

exports.getCourierSettings = async (req, res) => {
    try {
        const shop = await getShop(req.tenantId);
        return res.json({ success: true, data: getCourierSummary(shop) });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to load courier settings' });
    }
};

exports.configureRedxCourier = async (req, res) => {
    try {
        const { error, value } = redxConfigSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, error: error.details[0].message });

        const shop = await getShop(req.tenantId);
        applyRedxConfigToShop(shop, value);
        await shop.save();

        return res.json({
            success: true,
            message: 'RedX courier configuration saved.',
            data: getCourierSummary(shop)
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message || 'Failed to save RedX courier configuration' });
    }
};

exports.disconnectRedxCourier = async (req, res) => {
    try {
        const shop = await getShop(req.tenantId);
        clearRedxConfigFromShop(shop);
        await shop.save();
        return res.json({
            success: true,
            message: 'RedX courier disconnected.',
            data: getCourierSummary(shop)
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to disconnect RedX courier' });
    }
};

exports.searchRedxAreas = async (req, res) => {
    try {
        const { error, value } = redxAreaSearchSchema.validate(req.body || {});
        if (error) return res.status(400).json({ success: false, error: error.details[0].message });

        const shop = await getShop(req.tenantId);
        const data = await getRedxAreas({
            shop,
            token: value.token,
            postCode: value.postCode,
            districtName: value.districtName
        });

        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message || 'Failed to load RedX areas' });
    }
};

exports.createRedxPickupStoreAndConfigure = async (req, res) => {
    try {
        const { error, value } = redxPickupStoreSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, error: error.details[0].message });

        const shop = await getShop(req.tenantId);
        const currentSummary = getCourierSummary(shop);
        if (currentSummary.redx.configured) {
            return res.status(400).json({
                success: false,
                error: 'RedX is already configured. Disconnect it before creating another pickup store.'
            });
        }

        const result = await createRedxPickupStore({
            shop,
            token: value.token,
            pickupStoreInput: value
        });
        const pickupStore = result.pickupStore || {};

        applyRedxConfigToShop(shop, {
            token: value.token,
            pickupStoreId: String(pickupStore.id || ''),
            pickupStoreName: pickupStore.name || value.name,
            pickupAddress: pickupStore.address || value.address,
            pickupAreaName: pickupStore.area_name || '',
            pickupAreaId: String(pickupStore.area_id || value.areaId || ''),
            enabled: value.enabled !== false
        });
        await shop.save();

        return res.json({
            success: true,
            message: 'RedX pickup store created and connected.',
            data: getCourierSummary(shop)
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message || 'Failed to create RedX pickup store' });
    }
};

exports.getRedxPickupStoreList = async (req, res) => {
    try {
        const shop = await getShop(req.tenantId);
        const data = await getRedxPickupStores({ shop });
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ success: false, error: error.message || 'Failed to load RedX pickup stores' });
    }
};

exports.setDefaultCourier = async (req, res) => {
    try {
        const { error, value } = defaultCourierSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, error: error.details[0].message });

        const shop = await getShop(req.tenantId);
        const summary = getCourierSummary(shop);
        if (value.provider === 'pathao' && !summary.pathao.configured) {
            return res.status(400).json({ success: false, error: 'Pathao is not configured for this shop.' });
        }
        if (value.provider === 'redx' && !summary.redx.configured) {
            return res.status(400).json({ success: false, error: 'RedX is not configured for this shop.' });
        }

        shop.couriers = shop.couriers || {};
        shop.couriers.defaultCourier = value.provider;
        await shop.save();

        return res.json({
            success: true,
            message: value.provider ? `${value.provider.toUpperCase()} set as default courier.` : 'Default courier cleared.',
            data: getCourierSummary(shop)
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to update default courier' });
    }
};

exports.createCourierShipment = async (req, res) => {
    try {
        const { error, value } = shipmentSchema.validate(req.body);
        if (error) return res.status(400).json({ success: false, error: error.details[0].message });

        const { id } = req.params;
        const shop = await getShop(req.tenantId);
        const order = await Order.findOne({ _id: id, shop_id: req.tenantId, isDeleted: false });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        if (order.courierShipment?.trackingId || order.isPathaoSynced) {
            return res.status(400).json({
                success: false,
                error: 'This order already has an active courier shipment.'
            });
        }

        if (value.provider === 'redx') {
            const redx = getCourierSummary(shop).redx;
            if (!redx.configured || !redx.enabled) {
                return res.status(400).json({ success: false, error: 'RedX is not configured for this shop.' });
            }
            if (!toLocalBDPhone(order.shipping?.address?.phone)) {
                return res.status(400).json({ success: false, error: 'Customer phone number is invalid for RedX. Please update the order phone number.' });
            }

            const redxIdempotencyKey = `redx:create:${order._id}`;
            const existingRedxStatus = (order.courierShipment?.provider === 'redx' || order.shippingProvider === 'redx')
                ? order.courierShipment?.status
                : '';

            if (['queued', 'syncing'].includes(existingRedxStatus) && !value.retry) {
                return res.status(202).json({
                    success: true,
                    status: existingRedxStatus,
                    data: order,
                    message: 'RedX parcel creation is already queued'
                });
            }

            if (existingRedxStatus === 'syncing' && value.retry) {
                return res.status(409).json({
                    success: false,
                    status: 'syncing',
                    data: order,
                    error: 'RedX parcel creation is currently running. Please wait a moment before retrying.'
                });
            }

            if (value.retry) {
                const requeueResult = await requeueJobs({
                    queue: 'courier',
                    name: 'courier.create_parcel',
                    shop_id: req.tenantId,
                    $or: [
                        { idempotencyKey: redxIdempotencyKey },
                        { 'payload.orderId': { $in: [order._id, String(order._id)] } }
                    ],
                    status: { $in: ['queued', 'failed', 'dead'] }
                });
                const matchedJobs = requeueResult?.matchedCount ?? requeueResult?.n ?? 0;
                let job = null;

                if (!matchedJobs) {
                    if (!value.shipmentInput.deliveryArea || !value.shipmentInput.deliveryAreaId) {
                        return res.status(400).json({
                            success: false,
                            error: 'The original RedX courier job was not found. Open Create Parcel and select the delivery area again.'
                        });
                    }
                    job = await enqueueJob({
                        queue: 'courier',
                        name: 'courier.create_parcel',
                        shop_id: req.tenantId,
                        payload: {
                            provider: 'redx',
                            shopId: req.tenantId,
                            orderId: order._id,
                            shipmentInput: value.shipmentInput
                        },
                        maxAttempts: 3,
                        idempotencyKey: redxIdempotencyKey
                    });
                }

                order.shippingProvider = 'redx';
                order.courierShipment = {
                    ...(order.courierShipment || {}),
                    provider: 'redx',
                    status: 'queued',
                    trackingId: '',
                    lastError: '',
                    lastSyncedAt: new Date()
                };
                await order.save();

                return res.status(202).json({
                    success: true,
                    status: 'queued',
                    jobId: job?._id,
                    data: order,
                    message: 'RedX parcel retry queued'
                });
            }

            if (!value.shipmentInput.deliveryArea || !value.shipmentInput.deliveryAreaId) {
                return res.status(400).json({ success: false, error: 'RedX delivery area and delivery area ID are required.' });
            }

            const job = await enqueueJob({
                queue: 'courier',
                name: 'courier.create_parcel',
                shop_id: req.tenantId,
                payload: {
                    provider: 'redx',
                    shopId: req.tenantId,
                    orderId: order._id,
                    shipmentInput: value.shipmentInput
                },
                maxAttempts: 3,
                idempotencyKey: redxIdempotencyKey
            });

            order.shippingProvider = 'redx';
            order.courierShipment = {
                provider: 'redx',
                status: 'queued',
                trackingId: '',
                lastError: '',
                createdAt: null,
                lastSyncedAt: new Date()
            };
            await order.save();

            return res.status(202).json({
                success: true,
                status: 'queued',
                jobId: job?._id,
                data: order,
                message: 'RedX parcel creation queued'
            });
        }

        return res.status(400).json({ success: false, error: 'Unsupported courier provider.' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to create courier shipment' });
    }
};

const getOrderShipment = async ({ orderId, shopId }) => {
    const order = await Order.findOne({ _id: orderId, shop_id: shopId, isDeleted: false });
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }
    const provider = order.courierShipment?.provider || order.shippingProvider;
    const trackingId = order.courierShipment?.trackingId || order.shipping?.trackingId || order.pathaoConsignmentId;
    if (!provider || !trackingId) {
        const error = new Error('No courier shipment found for this order');
        error.statusCode = 400;
        throw error;
    }
    return { order, provider, trackingId };
};

exports.trackCourierShipment = async (req, res) => {
    try {
        const { provider, trackingId } = await getOrderShipment({ orderId: req.params.id, shopId: req.tenantId });
        const shop = await getShop(req.tenantId);

        if (provider !== 'redx') {
            return res.status(400).json({ success: false, error: 'Tracking is currently available for RedX shipments only.' });
        }

        const data = await trackRedxParcel({ shop, trackingId });
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to track courier shipment' });
    }
};

exports.getCourierShipmentInfo = async (req, res) => {
    try {
        const { provider, trackingId } = await getOrderShipment({ orderId: req.params.id, shopId: req.tenantId });
        const shop = await getShop(req.tenantId);

        if (provider !== 'redx') {
            return res.status(400).json({ success: false, error: 'Parcel info is currently available for RedX shipments only.' });
        }

        const data = await getRedxParcelInfo({ shop, trackingId });
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to load courier shipment info' });
    }
};
