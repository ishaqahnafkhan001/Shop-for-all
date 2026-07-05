const Order = require('../../models/Order');
const User = require('../../models/User');
const { buildPagination } = require('../../utils/pagination');
const {
    normalizePage,
    normalizeLimit,
    normalizeSearch,
    escapeRegex,
    parseDate
} = require('../../utils/listQuery');

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

const STATUS_VALUES = new Set(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned']);
const PAYMENT_STATUS_VALUES = new Set(['Pending', 'Paid', 'Failed', 'Refunded']);
const COURIER_STATUS_VALUES = new Set(['not_queued', 'queued', 'syncing', 'synced', 'failed']);
const SORT_MAP = Object.freeze({
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    total_desc: { 'pricing.total': -1, createdAt: -1 },
    total_asc: { 'pricing.total': 1, createdAt: -1 },
    status_asc: { status: 1, createdAt: -1 }
});

const findMatchingCustomerIds = async ({ shopId, search }) => {
    if (!search) return [];
    const regex = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({
        shop_id: shopId,
        role: 'Customer',
        $or: [
            { fullName: regex },
            { email: regex }
        ]
    }).select('_id').limit(50).lean();
    return users.map(user => user._id);
};

const buildOrderQuery = async ({ shopId, filters = {} }) => {
    const query = { shop_id: shopId, isDeleted: false };

    if (STATUS_VALUES.has(filters.status)) query.status = filters.status;
    if (PAYMENT_STATUS_VALUES.has(filters.paymentStatus)) query['payment.status'] = filters.paymentStatus;
    if (COURIER_STATUS_VALUES.has(filters.courierStatus)) query['courierShipment.status'] = filters.courierStatus;

    const dateFrom = parseDate(filters.dateFrom);
    const dateTo = parseDate(filters.dateTo);
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = dateFrom;
        if (dateTo) {
            const inclusiveEnd = new Date(dateTo);
            inclusiveEnd.setHours(23, 59, 59, 999);
            query.createdAt.$lte = inclusiveEnd;
        }
    }

    const search = normalizeSearch(filters.search);
    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const matchingCustomerIds = await findMatchingCustomerIds({ shopId, search });
        query.$or = [
            { 'shipping.address.fullName': regex },
            { 'shipping.address.phone': regex },
            { 'shipping.trackingId': regex },
            { 'courierShipment.trackingId': regex },
            { 'items.title': regex },
            ...(matchingCustomerIds.length ? [{ customer: { $in: matchingCustomerIds } }] : [])
        ];
        if (/^[a-f0-9]{6,24}$/i.test(search)) {
            query.$or.push({
                $expr: {
                    $regexMatch: {
                        input: { $toString: '$_id' },
                        regex: escapeRegex(search),
                        options: 'i'
                    }
                }
            });
        }
    }

    return query;
};

const getShopOrdersPage = async ({ shopId, page = 1, limit = 25, filters = {} }) => {
    const safePage = normalizePage(page);
    const safeLimit = normalizeLimit(limit, 25);
    const skip = (safePage - 1) * safeLimit;
    const query = await buildOrderQuery({ shopId, filters });
    const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;

    const [orders, total] = await Promise.all([
        Order.find(query)
            .select([
                'customer',
                'items.productId',
                'items.variantId',
                'items.title',
                'items.sku',
                'items.attributes',
                'items.quantity',
                'items.price',
                'items.total',
                'pricing',
                'promotion',
                'payment',
                'shipping',
                'shippingProvider',
                'courierShipment',
                'status',
                'notes',
                'cancellation',
                'timeline',
                'source',
                'isPathaoSynced',
                'pathaoConsignmentId',
                'pathaoSyncStatus',
                'pathaoLastError',
                'createdAt',
                'updatedAt'
            ].join(' '))
            .populate('customer', 'fullName email')
            .sort(sort)
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Order.countDocuments(query)
    ]);

    return {
        orders,
        pagination: buildPagination({ total, page: safePage, limit: safeLimit })
    };
};

module.exports = {
    getCustomerOrders,
    getCustomerOrderById,
    getShopOrdersPage,
    buildOrderQuery
};
