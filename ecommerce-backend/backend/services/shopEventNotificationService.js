const { createNotification } = require('./notificationService');
const {
    getVendorAdminEmails,
    sendVendorNotificationEmailSafe,
    buildVendorEventEmail
} = require('./vendorNotificationEmailService');
const Order = require('../models/Order');
const User = require('../models/User');
const { enqueueJob } = require('./jobQueueService');
const logger = require('./logger');

const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD')}`;
const shortId = (value) => `#${String(value || '').slice(-6).toUpperCase()}`;

const runSafely = (taskName, fn) => {
    setImmediate(async () => {
        try {
            await fn();
        } catch (err) {
            console.error(`[ShopEventNotification] ${taskName} failed:`, err.message);
        }
    });
};

const sendNewOrderNotificationNow = async ({ shop_id, order, customer }) => {
    const orderCode = shortId(order._id);
    await createNotification({
        shop_id,
        type: 'order',
        title: 'New order received',
        message: `${customer?.fullName || 'A customer'} placed order ${orderCode} for ${formatCurrency(order.pricing?.total)}.`,
        entityType: 'Order',
        entityId: order._id,
        severity: 'success',
        metadata: {
            total: order.pricing?.total,
            customerName: customer?.fullName || '',
            customerEmail: customer?.email || ''
        }
    });

    const emails = await getVendorAdminEmails(shop_id);
    if (emails.length === 0) return;

    const html = buildVendorEventEmail({
        title: 'New order received',
        intro: 'A new order was placed on your store. Review it in the admin panel before processing fulfillment.',
        rows: [
            { label: 'Order', value: orderCode },
            { label: 'Customer', value: customer?.fullName || 'Customer' },
            { label: 'Email', value: customer?.email || 'Not provided' },
            { label: 'Total', value: formatCurrency(order.pricing?.total) },
            { label: 'Payment', value: order.payment?.method || 'COD' }
        ]
    });

    sendVendorNotificationEmailSafe({
        to: emails,
        subject: `New order ${orderCode}`,
        html,
        text: `New order ${orderCode} for ${formatCurrency(order.pricing?.total)} from ${customer?.fullName || 'a customer'}.`
    });
};

const sendCustomerRegisteredNotificationNow = async ({ shop_id, customer }) => {
    await createNotification({
        shop_id,
        type: 'customer',
        title: 'New customer registered',
        message: `${customer.fullName || customer.email} joined your store.`,
        entityType: 'User',
        entityId: customer._id,
        severity: 'info',
        metadata: {
            customerName: customer.fullName || '',
            customerEmail: customer.email || ''
        }
    });

    const emails = await getVendorAdminEmails(shop_id);
    if (emails.length === 0) return;

    const html = buildVendorEventEmail({
        title: 'New customer registered',
        intro: 'A shopper created an account for your store. You can view them from the Customers page.',
        rows: [
            { label: 'Customer', value: customer.fullName || 'Customer' },
            { label: 'Email', value: customer.email || 'Not provided' },
            { label: 'Customer ID', value: shortId(customer._id) }
        ]
    });

    sendVendorNotificationEmailSafe({
        to: emails,
        subject: 'New customer registered',
        html,
        text: `${customer.fullName || customer.email} joined your store.`
    });
};

const notifyNewOrder = ({ shop_id, order, customer }) => {
    runSafely('new order notification', async () => {
        try {
            await enqueueJob({
                queue: 'notifications',
                name: 'shop.new_order',
                shop_id,
                payload: {
                    orderId: order._id,
                    customerId: customer?._id || order.customer || null,
                    customerSnapshot: {
                        fullName: customer?.fullName || '',
                        email: customer?.email || ''
                    }
                },
                idempotencyKey: `shop.new_order:${order._id}`
            });
        } catch (error) {
            logger.warn('notification_enqueue_failed', { shopId: shop_id, orderId: order._id, error });
            await sendNewOrderNotificationNow({ shop_id, order, customer });
        }
    });
};

const notifyCustomerRegistered = ({ shop_id, customer }) => {
    runSafely('new customer notification', async () => {
        try {
            await enqueueJob({
                queue: 'notifications',
                name: 'shop.customer_registered',
                shop_id,
                payload: { customerId: customer._id },
                idempotencyKey: `shop.customer_registered:${customer._id}`
            });
        } catch (error) {
            logger.warn('notification_enqueue_failed', { shopId: shop_id, customerId: customer._id, error });
            await sendCustomerRegisteredNotificationNow({ shop_id, customer });
        }
    });
};

const processShopEventJob = async (job) => {
    if (job.name === 'shop.new_order') {
        const order = await Order.findOne({
            _id: job.payload?.orderId,
            shop_id: job.shop_id,
            isDeleted: false
        }).lean();

        if (!order) throw new Error('Order not found for notification job');

        const customer = order.customer
            ? await User.findById(order.customer).select('fullName email').lean()
            : job.payload?.customerSnapshot || {};

        await sendNewOrderNotificationNow({ shop_id: job.shop_id, order, customer: customer || job.payload?.customerSnapshot });
        return;
    }

    if (job.name === 'shop.customer_registered') {
        const customer = await User.findOne({
            _id: job.payload?.customerId,
            shop_id: job.shop_id,
            role: 'Customer'
        }).select('fullName email').lean();

        if (!customer) throw new Error('Customer not found for notification job');
        await sendCustomerRegisteredNotificationNow({ shop_id: job.shop_id, customer });
        return;
    }

    throw new Error(`Unsupported notification job: ${job.name}`);
};

module.exports = {
    notifyNewOrder,
    notifyCustomerRegistered,
    processShopEventJob
};
