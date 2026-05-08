const axios = require('axios');

const PATHAO_BASE_URL = 'https://courier-api-sandbox.pathao.com';
const PATHAO_CLIENT_ID = '7N1aMJQbWm';
const PATHAO_CLIENT_SECRET = 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39';
const PATHAO_USERNAME = 'test@pathao.com';
const PATHAO_PASSWORD = 'lovePathao';

exports.getPathaoToken = async () => {
    try {
        const { data } = await axios.post(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
            client_id: PATHAO_CLIENT_ID,
            client_secret: PATHAO_CLIENT_SECRET,
            grant_type: 'password',
            username: PATHAO_USERNAME,
            password: PATHAO_PASSWORD
        });
        return data.access_token;
    } catch (error) {
        console.error("Pathao Token Error:", error.response?.data || error.message);
        throw new Error('Failed to authenticate with Pathao');
    }
};

exports.createPathaoOrder = async (token, payload) => {
    try {
        const { data } = await axios.post(`${PATHAO_BASE_URL}/aladdin/api/v1/orders`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return data;
    } catch (error) {
        console.error("Pathao Create Order Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create order in Pathao');
    }
};