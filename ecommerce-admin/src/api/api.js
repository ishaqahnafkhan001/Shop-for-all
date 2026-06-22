import axios from 'axios';

const CSRF_HEADER = 'x-csrf-token';
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let csrfToken = null;
let csrfTokenRequest = null;

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

const shouldAttachCsrf = (config) => {
    const method = String(config.method || 'get').toLowerCase();
    const url = String(config.url || '');

    return UNSAFE_METHODS.has(method) &&
        !url.includes('/auth/csrf-token') &&
        !url.includes('/auth/login') &&
        !url.includes('/auth/forgot-password') &&
        !url.includes('/auth/verify-reset-otp') &&
        !url.includes('/auth/reset-password');
};

const fetchCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    if (!csrfTokenRequest) {
        const baseURL = API.defaults.baseURL || '';
        csrfTokenRequest = axios
            .get(`${baseURL}/auth/csrf-token`, { withCredentials: true })
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

        if (error.response?.status === 401) {
            console.warn('Unauthorized or session expired');
        }

        if (error.response?.status === 403 && error.response?.data?.error === 'Invalid CSRF token') {
            csrfToken = null;
        }

        return Promise.reject(error);
    }
);

export default API;
