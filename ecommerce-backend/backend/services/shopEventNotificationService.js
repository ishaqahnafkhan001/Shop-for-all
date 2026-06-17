const { createNotification } = require('./notificationService');
const {
    getVendorAdminEmails,
    sendVendorNotificationEmailSafe,
    buildVendorEventEmail
} = require('./vendorNotificationEmailService');

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

const notifyNewOrder = ({ shop_id, order, customer }) => {
    runSafely('new order notification', async () => {
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
    });
};

const notifyCustomerRegistered = ({ shop_id, customer }) => {
    runSafely('new customer notification', async () => {
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
    });
};

module.exports = {
    notifyNewOrder,
    notifyCustomerRegistered
};
