const { encryptSecret, maskSecret } = require('../utils/secretCrypto');

const getPathaoConfig = (shop = {}) => {
    const pathao = shop.couriers?.pathao || {};
    const storeId = pathao.storeId || shop.pathaoStoreId || null;
    const enabled = Boolean(pathao.enabled || storeId);

    return {
        enabled,
        configured: Boolean(storeId),
        storeId,
        storeName: pathao.storeName || '',
        status: enabled ? (pathao.status === 'Disabled' ? 'Disabled' : 'Active') : 'NotConfigured',
        maskedCredentialsAvailable: Boolean(shop.pathaoCredentials?.client_id),
        isLive: Boolean(shop.pathaoCredentials?.isLive)
    };
};

const getRedxConfig = (shop = {}) => {
    const redx = shop.couriers?.redx || {};
    const configured = Boolean(redx.tokenEncrypted && redx.pickupStoreId);

    return {
        enabled: Boolean(redx.enabled && configured),
        configured,
        pickupStoreId: redx.pickupStoreId || '',
        pickupStoreName: redx.pickupStoreName || '',
        pickupAddress: redx.pickupAddress || '',
        pickupAreaName: redx.pickupAreaName || '',
        pickupAreaId: redx.pickupAreaId || '',
        status: configured ? (redx.status || 'Configured') : 'NotConfigured',
        maskedToken: redx.tokenLast4 ? maskSecret(redx.tokenLast4) : '',
        configuredAt: redx.configuredAt || null,
        lastVerifiedAt: redx.lastVerifiedAt || null
    };
};

const getCourierSummary = (shop = {}) => ({
    pathao: getPathaoConfig(shop),
    redx: getRedxConfig(shop),
    defaultCourier: shop.couriers?.defaultCourier || (getPathaoConfig(shop).configured ? 'pathao' : (getRedxConfig(shop).configured ? 'redx' : null))
});

const applyRedxConfigToShop = (shop, config = {}) => {
    const token = String(config.token || '').trim();
    const pickupStoreId = String(config.pickupStoreId || '').trim();
    if (!token && !shop.couriers?.redx?.tokenEncrypted) {
        throw new Error('RedX API token is required');
    }
    if (!pickupStoreId) {
        throw new Error('RedX pickup store ID is required');
    }

    shop.couriers = shop.couriers || {};
    const currentRedx = shop.couriers.redx || {};
    shop.couriers.redx = {
        ...currentRedx,
        enabled: config.enabled !== false,
        tokenEncrypted: token ? encryptSecret(token) : currentRedx.tokenEncrypted,
        tokenLast4: token ? token.slice(-4) : currentRedx.tokenLast4,
        pickupStoreId,
        pickupStoreName: String(config.pickupStoreName || '').trim(),
        pickupAddress: String(config.pickupAddress || '').trim(),
        pickupAreaName: String(config.pickupAreaName || '').trim(),
        pickupAreaId: String(config.pickupAreaId || '').trim(),
        status: config.enabled === false ? 'Disabled' : 'Active',
        configuredAt: currentRedx.configuredAt || new Date(),
        lastVerifiedAt: new Date()
    };
    if (!shop.couriers.defaultCourier) shop.couriers.defaultCourier = 'redx';
};

const clearRedxConfigFromShop = (shop) => {
    shop.couriers = shop.couriers || {};
    shop.couriers.redx = {
        enabled: false,
        tokenEncrypted: '',
        tokenLast4: '',
        pickupStoreId: '',
        pickupStoreName: '',
        pickupAddress: '',
        pickupAreaName: '',
        pickupAreaId: '',
        status: 'NotConfigured',
        lastVerifiedAt: null,
        configuredAt: null
    };
    if (shop.couriers.defaultCourier === 'redx') {
        shop.couriers.defaultCourier = getPathaoConfig(shop).configured ? 'pathao' : null;
    }
};

const mirrorPathaoConfigOnShop = (shop, { storeId, storeName = '', enabled = true, status = 'Active' } = {}) => {
    shop.couriers = shop.couriers || {};
    shop.couriers.pathao = {
        ...(shop.couriers.pathao || {}),
        enabled,
        storeId: storeId || shop.pathaoStoreId || null,
        storeName,
        status,
        configuredAt: shop.couriers?.pathao?.configuredAt || new Date(),
        lastSyncedAt: new Date()
    };
    if (!shop.couriers.defaultCourier) shop.couriers.defaultCourier = 'pathao';
};

module.exports = {
    applyRedxConfigToShop,
    clearRedxConfigFromShop,
    getCourierSummary,
    getPathaoConfig,
    getRedxConfig,
    mirrorPathaoConfigOnShop
};
