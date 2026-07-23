const POLICY_TYPES = ['refund', 'shipping', 'privacy', 'terms'];

export const POLICY_LABELS = {
    refund: 'Refund Policy',
    shipping: 'Shipping Policy',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
};

const POLICY_TEMPLATES = {
    refund: 'Refund or return requests should be submitted within 24 hours of delivery. Products must be unused, undamaged, and in their original packaging. Contact {{STORE_NAME}} with your order details and proof of the issue.',
    shipping: '{{STORE_NAME}} usually processes confirmed orders within 1-3 business days. Delivery time and charges vary by location and courier availability. Please provide a complete address and reachable phone number.',
    privacy: '{{STORE_NAME}} uses customer contact, delivery, and order information only to process orders, provide support, improve the service, and prevent misuse. Personal information is not sold.',
    terms: 'By using {{STORE_NAME}}, customers agree to review product, price, quantity, and delivery information before ordering. Orders may be cancelled for unavailable stock, invalid details, or suspected misuse.',
};

export const getDefaultPolicyText = (type, context = {}) => {
    const storeName = String(context.storeName || context.shopName || 'this store').trim();
    return String(POLICY_TEMPLATES[type] || '').replace(/\{\{STORE_NAME\}\}/g, storeName);
};

export const buildDefaultPolicies = (context = {}) => POLICY_TYPES.reduce((acc, type) => {
    acc[type] = getDefaultPolicyText(type, context);
    return acc;
}, {});
