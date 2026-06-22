import axios from 'axios';

// src/api/api.js
const CSRF_HEADER = 'x-csrf-token';
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let csrfToken = null;
let csrfTokenRequest = null;

const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        if (process.env.NEXT_PUBLIC_USE_DIRECT_API === 'true' && process.env.NEXT_PUBLIC_API_URL) {
            return process.env.NEXT_PUBLIC_API_URL;
        }

        return '/api';
    }

    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
};

const API = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
});

const shouldAttachCsrf = (config) => {
    const method = String(config.method || 'get').toLowerCase();
    const url = String(config.url || '');

    return typeof window !== 'undefined' &&
        UNSAFE_METHODS.has(method) &&
        !url.includes('/auth/csrf-token') &&
        !url.includes('/auth/login') &&
        !url.includes('/auth/forgot-password') &&
        !url.includes('/auth/verify-reset-otp') &&
        !url.includes('/auth/reset-password');
};

const fetchCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    if (!csrfTokenRequest) {
        csrfTokenRequest = axios
            .get(`${API.defaults.baseURL}/auth/csrf-token`, { withCredentials: true })
            .then((response) => response.data?.csrfToken)
            .finally(() => {
                csrfTokenRequest = null;
            });
    }

    csrfToken = await csrfTokenRequest;
    return csrfToken;
};

API.interceptors.request.use(async (config) => {
    if (!shouldAttachCsrf(config)) return config;

    const token = await fetchCsrfToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers[CSRF_HEADER] = token;
    }

    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 403 && error.response?.data?.error === 'Invalid CSRF token') {
            csrfToken = null;
        }

        return Promise.reject(error);
    }
);

export default API;
