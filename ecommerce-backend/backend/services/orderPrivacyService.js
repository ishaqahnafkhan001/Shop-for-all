const toPlainObject = (value) => {
    if (!value) return value;
    if (typeof value.toObject === 'function') return value.toObject({ virtuals: true });
    return { ...value };
};

const sanitizeOrderItemForCustomer = (item = {}) => {
    const clean = toPlainObject(item) || {};
    delete clean.buyingPrice;
    return clean;
};

const sanitizeOrderForCustomer = (order) => {
    const clean = toPlainObject(order);
    if (!clean) return clean;

    if (Array.isArray(clean.items)) {
        clean.items = clean.items.map(sanitizeOrderItemForCustomer);
    }

    return clean;
};

const sanitizeOrdersForCustomer = (orders = []) => orders.map(sanitizeOrderForCustomer);

module.exports = {
    sanitizeOrderForCustomer,
    sanitizeOrdersForCustomer
};
