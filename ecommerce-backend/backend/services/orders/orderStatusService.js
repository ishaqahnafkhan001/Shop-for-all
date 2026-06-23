const buildStatusUpdate = (status) => {
    const update = { status };
    if (status === 'Shipped') update['shipping.shippedAt'] = new Date();
    if (status === 'Delivered') update['shipping.deliveredAt'] = new Date();
    return update;
};

const isStockRestorationStatus = (status) => ['Cancelled', 'Returned'].includes(status);

const shouldBlockStatusUpdateForStockRestoration = (status) => isStockRestorationStatus(status);

module.exports = {
    buildStatusUpdate,
    isStockRestorationStatus,
    shouldBlockStatusUpdateForStockRestoration
};
