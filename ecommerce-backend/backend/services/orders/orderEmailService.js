const { notifyNewOrder } = require('../shopEventNotificationService');
const Shop = require('../../models/Shop');
const Order = require('../../models/Order');
const User = require('../../models/User');
const { enqueueJob } = require('../jobQueueService');
const { sendMail } = require('../mail/mailService');
const { getOrderStatusMessage } = require('../mail/templates/orderStatusTemplate');

const ORDER_RECEIPT_QUEUE = 'transactional-email';
const ORDER_RECEIPT_JOB = 'order.placed_receipt';

const oneLine = value => String(value || '').replace(/\s+/g, ' ').trim();
const money = value => `৳${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatOrderDetails = order => {
    const lines = ['Order details:'];
    for (const item of order.items || []) {
        const attributes = (item.attributes || []).map(attribute =>
            [oneLine(attribute.name), oneLine(attribute.value)].filter(Boolean).join(': ')
        ).filter(Boolean).join(', ');
        lines.push(`${item.quantity} × ${oneLine(item.title)}${attributes ? ` (${attributes})` : ''} — ${money(item.total)}`);
    }
    lines.push(`Subtotal: ${money(order.pricing?.subtotal)}`);
    if (Number(order.pricing?.discount) > 0) lines.push(`Discount: −${money(order.pricing.discount)}`);
    lines.push(`Delivery: ${money(order.pricing?.shipping)}`);
    lines.push(`Total: ${money(order.pricing?.total)}`);
    lines.push(`Payment: ${oneLine(order.payment?.method || 'COD')}`);
    const address = order.shipping?.address;
    if (address) {
        lines.push(`Delivery address: ${[address.addressLine, address.city, order.shipping.zone]
            .map(oneLine).filter(Boolean).join(', ')}`);
    }
    return lines.join('\n');
};

const notifyOrderCreated = ({ shop_id, order, customer }) => (
    notifyNewOrder({ shop_id, order, customer })
);

const getDefaultStatusEmail = ({ order, status }) => {
    if (status === 'Placed') {
        return {
            subject: `We received your order #${String(order._id).slice(-6).toUpperCase()}`,
            message: `Hi ${order.customer?.fullName || 'Customer'},\n\nWe received your order #${String(order._id).slice(-6).toUpperCase()}. You can track it from the store.\n\nThank you for shopping with us.`
        };
    }
    if (status === 'Confirmed') {
        return {
            subject: 'Your order has been confirmed',
            message: `Hi ${order.customer?.fullName || 'Customer'},

Your order #${String(order._id).slice(-6).toUpperCase()} has been confirmed.

We will start preparing your order soon. You can track your order anytime from the store.

Thank you for shopping with us.`
        };
    }

    return {
        subject: `Your order is now ${status}`,
        message: getOrderStatusMessage({
            customerName: order.customer?.fullName || 'Customer',
            orderId: String(order._id).slice(-6).toUpperCase(),
            status
        })
    };
};

const notifyCustomerOrderStatus = async ({
    shopId,
    order,
    status,
    subject,
    message,
    idempotencyKey,
    send = sendMail
}) => {
    const customerEmail = order.customer?.email;
    if (!customerEmail) return { sent: false, reason: 'missing_customer_email' };

    const shop = await Shop.findById(shopId).select('shopName').lean();
    const defaults = getDefaultStatusEmail({ order, status });
    const content = [message || defaults.message,
        ...(['Placed', 'Confirmed'].includes(status) ? [formatOrderDetails(order)] : [])].join('\n\n');

    await send({
        type: 'order',
        to: customerEmail,
        subject: subject || defaults.subject,
        senderName: oneLine(shop?.shopName) || 'Store',
        recipientName: order.customer?.fullName || 'Customer',
        content,
        text: content,
        showGreeting: false,
        idempotencyKey
    });

    return { sent: true, status: 'accepted' };
};

const enqueueOrderReceipt = async ({ shopId, order, customer, session = null }, enqueue = enqueueJob) => {
    if (!customer?.email) return null;
    return enqueue({
        queue: ORDER_RECEIPT_QUEUE,
        name: ORDER_RECEIPT_JOB,
        shop_id: shopId,
        payload: { orderId: order._id, customerId: customer._id },
        idempotencyKey: `order.placed_receipt:${order._id}`,
        maxAttempts: 3,
        session
    });
};

const processOrderReceiptJob = async (job, notify = notifyCustomerOrderStatus) => {
    if (job.name !== ORDER_RECEIPT_JOB) throw new Error('Unsupported order receipt job');
    const order = await Order.findOne({ _id: job.payload?.orderId, shop_id: job.shop_id,
        customer: job.payload?.customerId, isDeleted: false }).lean();
    if (!order) throw new Error('Order receipt cannot find its tenant-scoped order');
    const customer = await User.findOne({ _id: job.payload.customerId,
        shop_id: job.shop_id, role: 'Customer' }).select('fullName email').lean();
    if (!customer?.email) return { skipped: true };
    order.customer = customer;
    return notify({ shopId: job.shop_id, order, status: 'Placed',
        idempotencyKey: `order/placed/${job.shop_id}/${order._id}` });
};

module.exports = {
    ORDER_RECEIPT_QUEUE,
    ORDER_RECEIPT_JOB,
    formatOrderDetails,
    enqueueOrderReceipt,
    processOrderReceiptJob,
    notifyOrderCreated,
    notifyCustomerOrderStatus
};
