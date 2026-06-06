const Shop = require('../models/Shop');

const allowedThemeKeys = [
    'logoUrl',
    'faviconUrl',
    'fontFamily',
    'productGridStyle',
    'colors',
    'homepageSections',
    'navigation',
    'footer',
    'policies'
];

const pickThemePayload = (payload = {}) => {
    return allowedThemeKeys.reduce((acc, key) => {
        if (payload[key] !== undefined) acc[key] = payload[key];
        return acc;
    }, {});
};

exports.getStoreBuilderSettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme customDomain plan featureFlags storewideDiscount')
            .lean();

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        console.error('Get store builder settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load store builder settings' });
    }
};

exports.updateStoreBuilderSettings = async (req, res) => {
    try {
        const { theme = {}, customDomain, storewideDiscount } = req.body;
        const update = {};
        const cleanTheme = pickThemePayload(theme);

        for (const [key, value] of Object.entries(cleanTheme)) {
            update[`theme.${key}`] = value;
        }

        if (customDomain !== undefined) {
            update['customDomain.domain'] = customDomain.domain || '';
            update['customDomain.status'] = customDomain.domain ? 'PendingVerification' : 'NotConfigured';
            update['customDomain.lastCheckedAt'] = new Date();
        }

        if (storewideDiscount !== undefined) {
            update.storewideDiscount = Math.max(0, Math.min(100, Number(storewideDiscount) || 0));
        }

        const shop = await Shop.findByIdAndUpdate(
            req.tenantId,
            { $set: update },
            { new: true, runValidators: true }
        ).select('shopName subdomain theme customDomain plan featureFlags storewideDiscount');

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        res.status(200).json({
            success: true,
            message: 'Store settings updated',
            data: shop
        });
    } catch (err) {
        console.error('Update store builder settings error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update store builder settings' });
    }
};

exports.getPublicStorefrontSettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme storewideDiscount')
            .lean();

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        console.error('Get public storefront settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load storefront settings' });
    }
};
