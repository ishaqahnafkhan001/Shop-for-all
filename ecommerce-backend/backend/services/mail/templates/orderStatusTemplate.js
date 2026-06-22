exports.getOrderStatusMessage = ({ customerName, orderId, status }) => {
    const messages = {
        Pending: `Your order has been placed and is currently pending.`,
        Confirmed: `Good news! Your order has been confirmed.`,
        Processing: `Your order is now being processed.`,
        Shipped: `Your order has been shipped and is on the way.`,
        Delivered: `Your order has been delivered successfully.`,
        Cancelled: `Unfortunately your order has been cancelled.`,
    };

    return `Hello ${customerName},

${messages[status] || 'Your order status has been updated.'}

Order ID: #${orderId}

Thank you for shopping with us.`;
};
