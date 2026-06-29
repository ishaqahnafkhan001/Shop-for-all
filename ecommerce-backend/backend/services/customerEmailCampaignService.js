const User = require('../models/User');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const CustomerEmailCampaign = require('../models/CustomerEmailCampaign');
const { enqueueJob } = require('./jobQueueService');
const { sendMail } = require('./mail/mailService');
const { customerMessageTemplate } = require('./mail/templates/customMessageTemplate');
const {
    productPromotionTemplate
} = require('./mail/templates/productPromotionTemplate');
const { sanitizePublicProduct } = require('./publicProductSerializer');

const cleanText = (value = '', max = 2000) => String(value || '').trim().slice(0, max);

const customerQuery = (shopId) => ({
    shop_id: shopId,
    role: 'Customer',
    status: { $ne: 'Suspended' },
    email: { $exists: true, $ne: '' }
});

const buildStoreBaseUrl = (shop = {}) => {
    const customDomain = shop.customDomain?.status === 'Verified' && shop.customDomain?.domain
        ? shop.customDomain.domain
        : '';
    if (customDomain) return `https://${customDomain}`;

    const appDomain = String(process.env.STOREFRONT_DOMAIN || process.env.APP_DOMAIN || 'localhost:3000')
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${shop.subdomain}.${appDomain}`;
};

const createCampaignJob = async ({ shopId, sentBy, type, subject, message = '', productId = null }) => {
    const cleanSubject = cleanText(subject, 160);
    const cleanMessage = cleanText(message, 5000);
    if (!cleanSubject) {
        const err = new Error('Subject is required.');
        err.statusCode = 400;
        throw err;
    }

    const [recipientCount, shop] = await Promise.all([
        User.countDocuments(customerQuery(shopId)),
        Shop.findById(shopId).select('shopName subdomain customDomain').lean()
    ]);

    if (!shop) {
        const err = new Error('Shop not found.');
        err.statusCode = 404;
        throw err;
    }

    let product = null;
    if (type === 'product') {
        product = await Product.findOne({
            _id: productId,
            shop_id: shopId,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        }).lean();

        if (!product) {
            const err = new Error('Product not found.');
            err.statusCode = 404;
            throw err;
        }
    }

    const campaign = await CustomerEmailCampaign.create({
        shopId,
        sentBy,
        type,
        subject: cleanSubject,
        recipientCount,
        productId: product?._id || null,
        status: 'queued'
    });

    const job = await enqueueJob({
        queue: 'customer-email',
        name: type === 'product' ? 'customers.product_campaign' : 'customers.bulk_email',
        shop_id: shopId,
        payload: {
            campaignId: campaign._id,
            subject: cleanSubject,
            message: cleanMessage,
            productId: product?._id || null
        },
        idempotencyKey: `customer_email:${campaign._id}`
    });

    return { campaign, job };
};

const processCustomerEmailCampaignJob = async (job) => {
    const campaign = await CustomerEmailCampaign.findOne({
        _id: job.payload?.campaignId,
        shopId: job.shop_id
    });
    if (!campaign) throw new Error('Customer email campaign not found');

    campaign.status = 'sending';
    campaign.lastError = '';
    await campaign.save();

    const [shop, customers] = await Promise.all([
        Shop.findById(job.shop_id).select('shopName subdomain customDomain').lean(),
        User.find(customerQuery(job.shop_id)).select('fullName email').lean()
    ]);
    if (!shop) throw new Error('Shop not found for customer email campaign');

    let product = null;
    if (campaign.type === 'product') {
        product = await Product.findOne({
            _id: job.payload?.productId,
            shop_id: job.shop_id,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        }).lean();
        if (!product) throw new Error('Product not found for customer email campaign');
        product = sanitizePublicProduct(product);
    }

    const storeName = shop.shopName || 'Store';
    const baseUrl = buildStoreBaseUrl(shop);
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
        try {
            const html = campaign.type === 'product'
                ? productPromotionTemplate({
                    storeName,
                    customerName: customer.fullName,
                    subject: job.payload.subject,
                    message: job.payload.message,
                    product,
                    productUrl: `${baseUrl}/products/${product.slug || product._id}`
                })
                : customerMessageTemplate({
                    senderName: storeName,
                    name: customer.fullName || 'Customer',
                    email: customer.email,
                    subject: job.payload.subject,
                    message: job.payload.message
                });

            await sendMail({
                type: 'admin',
                to: customer.email,
                subject: job.payload.subject,
                senderName: storeName,
                html
            });
            sentCount += 1;
        } catch {
            failedCount += 1;
        }
    }

    campaign.sentCount = sentCount;
    campaign.failedCount = failedCount;
    campaign.status = failedCount > 0 && sentCount === 0 ? 'failed' : 'completed';
    campaign.lastError = failedCount > 0 ? `${failedCount} recipient emails failed.` : '';
    await campaign.save();
};

module.exports = {
    createCampaignJob,
    processCustomerEmailCampaignJob,
    buildStoreBaseUrl
};
