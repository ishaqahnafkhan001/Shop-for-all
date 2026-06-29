const axios = require('axios');
const { toLocalBDPhone } = require('../../utils/phoneUtils');
const { decryptSecret } = require('../../utils/secretCrypto');

const API_VERSION = '/v1.0.0-beta';
const DEFAULT_WEIGHT_GRAMS = 500;

const getApiBaseUrl = () => {
    const rawBaseUrl = String(process.env.REDX_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!rawBaseUrl) {
        throw new Error('RedX base URL is not configured');
    }

    const withProtocol = /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`;
    const withoutVersion = withProtocol.replace(/\/v1\.0\.0-beta\/?$/i, '');
    return `${withoutVersion}${API_VERSION}`;
};

const getRedxConfig = (shop) => shop?.couriers?.redx || {};

const getRedxToken = (shop, tokenOverride = '') => {
    if (tokenOverride) return tokenOverride;
    const tokenEncrypted = getRedxConfig(shop).tokenEncrypted;
    const token = decryptSecret(tokenEncrypted);
    if (!token) {
        throw new Error('RedX token is not configured');
    }
    return token;
};

const getClient = (shop) => axios.create({
    baseURL: getApiBaseUrl(),
    timeout: Number(process.env.REDX_TIMEOUT_MS || 15000),
    headers: {
        'Content-Type': 'application/json',
        'API-ACCESS-TOKEN': `Bearer ${getRedxToken(shop)}`
    }
});

const getClientWithToken = (shop, tokenOverride = '') => axios.create({
    baseURL: getApiBaseUrl(),
    timeout: Number(process.env.REDX_TIMEOUT_MS || 15000),
    headers: {
        'Content-Type': 'application/json',
        'API-ACCESS-TOKEN': `Bearer ${getRedxToken(shop, tokenOverride)}`
    }
});

const getProviderError = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'RedX request failed';
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.errors) return Object.values(data.errors).flat().join(', ');
    return 'RedX request failed';
};

const validateRedxConfig = ({ shop }) => {
    const redx = getRedxConfig(shop);
    if (!redx?.enabled || redx.status === 'Disabled') {
        throw new Error('RedX is not enabled for this shop');
    }
    if (!redx.pickupStoreId) {
        throw new Error('RedX pickup store ID is not configured');
    }
    if (!redx.tokenEncrypted) {
        throw new Error('RedX token is not configured');
    }
    return redx;
};

const getCustomerPhone = (phone) => {
    const localPhone = toLocalBDPhone(phone);
    if (!localPhone) {
        throw new Error('Customer phone number is invalid for RedX. Please update the order phone number.');
    }
    return localPhone;
};

const getCashCollectionAmount = (order, overrideValue) => {
    if (overrideValue !== undefined && overrideValue !== null && overrideValue !== '') {
        return Math.max(0, Number(overrideValue) || 0);
    }
    return order.payment?.method === 'COD' && order.payment?.status !== 'Paid'
        ? Math.max(0, Number(order.pricing?.total || 0))
        : 0;
};

const getDeclaredValue = (order, overrideValue) => {
    if (overrideValue !== undefined && overrideValue !== null && overrideValue !== '') {
        return Math.max(0, Number(overrideValue) || 0);
    }
    return Math.max(0, Number(order.pricing?.subtotal || order.pricing?.total || 0));
};

const getParcelWeight = (inputWeight) => {
    const number = Number(inputWeight);
    return Number.isFinite(number) && number > 0 ? number : DEFAULT_WEIGHT_GRAMS;
};

const toRedxId = (value, label) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${label} must be a valid RedX ID`);
    }
    return number;
};

const buildRedxParcelPayload = ({ shop, order, shipmentInput = {} }) => {
    const redx = validateRedxConfig({ shop });
    const deliveryArea = String(shipmentInput.deliveryArea || '').trim();
    const deliveryAreaId = shipmentInput.deliveryAreaId;

    if (!deliveryArea) throw new Error('RedX delivery area is required');
    if (!deliveryAreaId) throw new Error('RedX delivery area ID is required');
    if (!order.shipping?.address?.addressLine) throw new Error('Customer address is required for RedX parcel creation');

    return {
        customer_name: order.shipping?.address?.fullName || order.customer?.fullName || 'Customer',
        customer_phone: getCustomerPhone(order.shipping?.address?.phone),
        delivery_area: deliveryArea,
        delivery_area_id: toRedxId(deliveryAreaId, 'RedX delivery area ID'),
        customer_address: [order.shipping?.address?.addressLine, order.shipping?.address?.city].filter(Boolean).join(', '),
        merchant_invoice_id: String(order._id),
        cash_collection_amount: getCashCollectionAmount(order, shipmentInput.cashCollectionAmount),
        parcel_weight: getParcelWeight(shipmentInput.parcelWeight),
        instruction: String(shipmentInput.instruction || '').trim(),
        value: getDeclaredValue(order, shipmentInput.declaredValue),
        is_closed_box: shipmentInput.isClosedBox !== false,
        pickup_store_id: toRedxId(redx.pickupStoreId, 'RedX pickup store ID'),
        parcel_details_json: (order.items || []).map(item => ({
            name: item.title,
            category: 'general',
            value: Number(item.total || item.price || 0)
        }))
    };
};

const getRedxAreas = async ({ shop, token = '', postCode = '', districtName = '' }) => {
    try {
        const params = {};
        if (postCode) params.post_code = postCode;
        if (districtName) params.district_name = districtName;
        const { data } = await getClientWithToken(shop, token).get('/areas', { params });
        return {
            areas: Array.isArray(data?.areas) ? data.areas : []
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const createRedxPickupStore = async ({ shop, token = '', pickupStoreInput = {} }) => {
    try {
        const payload = {
            name: String(pickupStoreInput.name || '').trim(),
            phone: getCustomerPhone(pickupStoreInput.phone),
            address: String(pickupStoreInput.address || '').trim(),
            area_id: toRedxId(pickupStoreInput.areaId, 'RedX pickup area ID')
        };

        if (!payload.name) throw new Error('Pickup store name is required');
        if (!payload.address) throw new Error('Pickup store address is required');

        const { data } = await getClientWithToken(shop, token).post('/pickup/store', payload);
        return {
            pickupStore: data,
            payload
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const getRedxPickupStores = async ({ shop }) => {
    try {
        const { data } = await getClient(shop).get('/pickup/stores');
        return {
            pickupStores: Array.isArray(data?.pickup_stores) ? data.pickup_stores : []
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const getRedxPickupStoreInfo = async ({ shop, pickupStoreId }) => {
    try {
        const { data } = await getClient(shop).get(`/pickup/store/info/${encodeURIComponent(pickupStoreId)}`);
        return {
            pickupStore: data?.pickup_store || null
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const createRedxParcel = async ({ shop, order, shipmentInput = {} }) => {
    try {
        const payload = buildRedxParcelPayload({ shop, order, shipmentInput });
        const { data } = await getClient(shop).post('/parcel', payload);
        if (!data?.tracking_id) {
            throw new Error('RedX did not return a tracking ID');
        }
        return {
            trackingId: data.tracking_id,
            rawResponse: data,
            payload
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const trackRedxParcel = async ({ shop, trackingId }) => {
    try {
        const { data } = await getClient(shop).get(`/parcel/track/${encodeURIComponent(trackingId)}`);
        return {
            provider: 'redx',
            trackingId,
            updates: (data?.tracking || []).map(item => ({
                messageEn: item.message_en || '',
                messageBn: item.message_bn || '',
                time: item.time || null
            }))
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

const getRedxParcelInfo = async ({ shop, trackingId }) => {
    try {
        const { data } = await getClient(shop).get(`/parcel/info/${encodeURIComponent(trackingId)}`);
        return {
            provider: 'redx',
            trackingId,
            parcel: data?.parcel || null
        };
    } catch (error) {
        throw new Error(getProviderError(error));
    }
};

module.exports = {
    buildRedxParcelPayload,
    createRedxPickupStore,
    createRedxParcel,
    getApiBaseUrl,
    getRedxAreas,
    getRedxPickupStoreInfo,
    getRedxPickupStores,
    getRedxParcelInfo,
    trackRedxParcel,
    validateRedxConfig
};
