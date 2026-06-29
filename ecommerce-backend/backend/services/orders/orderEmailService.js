const { notifyNewOrder } = require('../shopEventNotificationService');
const Shop = require('../../models/Shop');
const { sendMail } = require('../mail/mailService');
const { getOrderStatusMessage } = require('../mail/templates/orderStatusTemplate');

const notifyOrderCreated = ({ shop_id, order, customer }) => (
    notifyNewOrder({ shop_id, order, customer })
);

const getDefaultStatusEmail = ({ order, status }) => {
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
    message
}) => {
    const customerEmail = order.customer?.email;
    if (!customerEmail) return { sent: false, reason: 'missing_customer_email' };

    const shop = await Shop.findById(shopId).select('shopName').lean();
    const defaults = getDefaultStatusEmail({ order, status });

    await sendMail({
        type: 'order',
        to: customerEmail,
        subject: subject || defaults.subject,
        senderName: shop?.shopName || 'Store',
        recipientName: order.customer?.fullName || 'Customer',
        content: message || defaults.message
    });

    return { sent: true };
};

module.exports = {
    notifyOrderCreated,
    notifyCustomerOrderStatus
};
