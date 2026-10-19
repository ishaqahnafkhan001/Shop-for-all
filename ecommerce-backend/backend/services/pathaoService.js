const axios = require('axios');
const { decryptSecret } = require('../utils/secretCrypto');

const SANDBOX_BASE_URL = 'https://courier-api-sandbox.pathao.com';
const LIVE_BASE_URL = 'https://api-hermes.pathao.com';
// null selects the platform account, while a boolean selects a linked merchant account.
const getBaseUrl = (isLive = null) => (isLive === null
    ? (process.env.PATHAO_BASE_URL || SANDBOX_BASE_URL)
    : (isLive ? LIVE_BASE_URL : SANDBOX_BASE_URL)).replace(/\/+$/, '');

// 1. Updated Token Generator (Accepts custom credentials)
exports.getPathaoToken = async (customCreds = null) => {
    try {
        const baseUrl = getBaseUrl(customCreds ? Boolean(customCreds.isLive) : null);
        const payload = {
            client_id: customCreds?.client_id || process.env.PATHAO_CLIENT_ID,
            client_secret: customCreds?.client_secret ? decryptSecret(customCreds.client_secret) : process.env.PATHAO_CLIENT_SECRET,
            grant_type: 'password',
            username: customCreds?.username || process.env.PATHAO_USERNAME,
            password: customCreds?.password ? decryptSecret(customCreds.password) : process.env.PATHAO_PASSWORD
        };

        if (!payload.client_id || !payload.client_secret || !payload.username || !payload.password) {
            throw new Error('Pathao credentials are incomplete');
        }
        const { data } = await axios.post(`${baseUrl}/aladdin/api/v1/issue-token`, payload, { timeout: 15000 });
        if (!data?.access_token) throw new Error('Pathao did not return an access token');
        return data.access_token;
    } catch (error) {
        throw new Error('Failed to authenticate with Pathao. Please check your credentials.');
    }
};
exports.createPathaoOrder = async (token, payload, isLive = null) => {
    try {
        const baseUrl = getBaseUrl(isLive);
        const { data } = await axios.post(`${baseUrl}/aladdin/api/v1/orders`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return data;
    } catch (error) {
        if (error.response?.data?.errors) {
            const errorMessages = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(`Pathao Error: ${errorMessages}`);
        }
        throw new Error(error.response?.data?.message || 'Failed to create order in Pathao');
    }
};
exports.getPathaoStores = async (token, isLive = null) => {
    try {
        const { data } = await axios.get(`${getBaseUrl(isLive)}/aladdin/api/v1/stores`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: 15000
        });

        return data;
    } catch (error) {
        throw new Error('Failed to load stores from Pathao');
    }
};

// --- UPDATED LOCATION FUNCTIONS WITH SAFE UNWRAPPING ---

exports.getPathaoCities = async (token) => {
    try {
        const { data } = await axios.get(`${getBaseUrl(null)}/aladdin/api/v1/city-list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Safely extract the array no matter how Pathao wraps it
        return data?.data?.data || data?.data || [];
    } catch (error) {
        console.error("❌ Fetch Cities Error:", error.response?.data || error.message);
        throw new Error('Failed to fetch cities from Pathao');
    }
};

exports.getPathaoZones = async (token, cityId) => {
    try {
        const { data } = await axios.get(`${getBaseUrl(null)}/aladdin/api/v1/cities/${cityId}/zone-list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data?.data?.data || data?.data || [];
    } catch (error) {
        console.error(`❌ Fetch Zones Error (City ID: ${cityId}):`, error.response?.data || error.message);
        throw new Error('Failed to fetch zones from Pathao');
    }
};

exports.getPathaoAreas = async (token, zoneId) => {
    try {
        const { data } = await axios.get(`${getBaseUrl(null)}/aladdin/api/v1/zones/${zoneId}/area-list`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Safely extract the array. If the zone has no areas, Pathao might omit the array entirely.
        let areas = [];
        if (Array.isArray(data?.data?.data)) {
            areas = data.data.data;
        } else if (Array.isArray(data?.data)) {
            areas = data.data;
        }

        return areas;
    } catch (error) {
        console.error(`❌ Fetch Areas Error (Zone ID: ${zoneId}):`, error.response?.data || error.message);
        throw new Error('Failed to fetch areas from Pathao');
    }
};

// -------------------------------------------------------

exports.createPathaoStore = async (token, payload) => {
    try {
        const { data } = await axios.post(`${getBaseUrl(null)}/aladdin/api/v1/stores`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return data;
    } catch (error) {
        console.error("Pathao Create Store Error:", error.response?.data || error.message);

        // Pathao often sends detailed validation errors in a specific format
        if (error.response?.data?.errors) {
            const errorMessages = Object.values(error.response.data.errors).flat().join(', ');
            throw new Error(`Pathao Error: ${errorMessages}`);
        }

        throw new Error(error.response?.data?.message || 'Failed to create store in Pathao');
    }
};
