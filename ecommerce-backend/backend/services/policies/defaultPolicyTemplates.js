const POLICY_TYPES = ['refund', 'shipping', 'privacy', 'terms'];

const DEFAULT_POLICY_TEMPLATES = {
    refund: {
        title: 'Refund Policy',
        body: `Thank you for shopping with {{STORE_NAME}}. We want our customers to have a smooth and reliable shopping experience.

Refund or return requests must be made within 24 hours of receiving the product. To be eligible for a return, the product must be unused, undamaged, and in its original packaging.

Refunds or exchanges may be accepted if:

* the product is damaged during delivery
* the wrong product is delivered
* the product is significantly different from the description
* the product has a verified quality issue

Refunds may not be accepted if:

* the product has been used
* the product is damaged after delivery
* the original packaging is missing
* the return request is made after the allowed return period
* the product is listed as non-returnable

Customers may need to provide order details, photos, or other proof when requesting a refund or return.

Approved refunds will be processed using the available payment or refund method agreed with the customer.

For refund or return support, please contact us using the contact information provided on our store.`
    },
    shipping: {
        title: 'Shipping Policy',
        body: `At {{STORE_NAME}}, we try to deliver orders safely and on time.

After an order is confirmed, we usually process it within 1-3 business days. Delivery time may vary depending on the customer's location, courier availability, holidays, weather, or other operational conditions.

Estimated delivery time:

* Inside major city areas: 2-5 business days
* Outside major city areas: 3-7 business days
* Remote areas may take longer

Delivery charges may vary based on location, product size, product weight, and courier service.

Customers should provide correct delivery information, including name, phone number, and full address. {{STORE_NAME}} is not responsible for delivery delays caused by incorrect or incomplete customer information.

If a parcel is delayed, lost, or damaged during delivery, customers should contact us so we can coordinate with the courier service.`
    },
    privacy: {
        title: 'Privacy Policy',
        body: `{{STORE_NAME}} respects customer privacy and is committed to protecting personal information.

We may collect customer information such as name, phone number, email address, delivery address, order details, and payment-related information when customers place an order or contact us.

We use this information to:

* process and deliver orders
* contact customers about their orders
* provide customer support
* improve our products and services
* prevent fraud or misuse

We do not sell customer personal information. Customer information may be shared only with necessary service providers such as delivery/courier partners, payment support providers, or platform service providers when required to complete an order or provide support.

Customers are responsible for providing accurate information. Customers may contact us to update or request information related to their orders.

By using this store, customers agree to the collection and use of information as described in this Privacy Policy.`
    },
    terms: {
        title: 'Terms & Conditions',
        body: `Welcome to {{STORE_NAME}}. By using this store and placing an order, customers agree to the following terms and conditions.

Customers should review product details, price, size, color, quantity, and delivery information before placing an order.

Product availability, pricing, and offers may change without prior notice. We try to keep all product information accurate, but small differences in color, packaging, or appearance may occur due to photography, screen settings, or supplier changes.

An order may be cancelled if:

* the product is out of stock
* payment information is invalid or incomplete
* delivery information is incorrect
* suspicious or fraudulent activity is detected
* the customer cannot be reached for confirmation

Customers must provide accurate contact and delivery details. {{STORE_NAME}} is not responsible for failed delivery caused by incorrect customer information.

All refunds, returns, and deliveries are handled according to our Refund Policy and Shipping Policy.

{{STORE_NAME}} reserves the right to update these terms when necessary. Continued use of the store means customers accept the updated terms.`
    }
};

const cleanPlaceholderValue = (value, fallback = '') => String(value || fallback || '').trim();

const injectPolicyPlaceholders = (body = '', context = {}) => {
    const storeName = cleanPlaceholderValue(context.storeName || context.shopName, 'this store');
    const contactEmail = cleanPlaceholderValue(context.contactEmail);
    const contactPhone = cleanPlaceholderValue(context.contactPhone);

    return String(body)
        .replace(/\{\{STORE_NAME\}\}/g, storeName)
        .replace(/\{\{CONTACT_EMAIL\}\}/g, contactEmail)
        .replace(/\{\{CONTACT_PHONE\}\}/g, contactPhone)
        .trim();
};

const getDefaultPolicyText = (type, context = {}) => {
    const template = DEFAULT_POLICY_TEMPLATES[type];
    if (!template) return '';
    return injectPolicyPlaceholders(template.body, context);
};

const buildDefaultPolicies = (context = {}) => POLICY_TYPES.reduce((acc, type) => {
    acc[type] = getDefaultPolicyText(type, context);
    return acc;
}, {});

const hasPolicyText = (value) => typeof value === 'string' && value.trim().length > 0;

const fillMissingPolicyDefaults = (existingPolicies = {}, context = {}) => {
    const policies = { ...(existingPolicies || {}) };
    const added = [];
    const skipped = [];

    POLICY_TYPES.forEach((type) => {
        if (hasPolicyText(policies[type])) {
            skipped.push(type);
            return;
        }

        policies[type] = getDefaultPolicyText(type, context);
        added.push(type);
    });

    return { policies, added, skipped };
};

module.exports = {
    POLICY_TYPES,
    DEFAULT_POLICY_TEMPLATES,
    injectPolicyPlaceholders,
    getDefaultPolicyText,
    buildDefaultPolicies,
    hasPolicyText,
    fillMissingPolicyDefaults
};
