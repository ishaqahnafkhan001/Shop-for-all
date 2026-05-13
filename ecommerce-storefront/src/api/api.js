import axios from 'axios';

const getBaseUrl = () => {
    const envUrl =process.env.NEXT_PUBLIC_API_URL;

    if (envUrl) {
        return envUrl;
    }

    // 2. Smart Dynamic Fallback based on the browser's current URL
    if (typeof window !== 'undefined') {
        const host = window.location.hostname; // e.g., 'localhost' or 'shop.scaleup.codes'

        // Local development
        if (host === 'localhost' || host.includes('127.0.0.1')) {
            return `http://${host}:4000/api`;
        }

        // If you are on your production domain, point to the production API
        if (host.includes('scaleup.codes')) {
            return 'https://api.scaleup.codes/api';
        }

        // Absolute fallback (assumes API is on the same exact domain)
        return `https://${host}/api`;
    }

    // Default for Server-Side Rendering (Next.js) when no env var is set
    return 'http://localhost:4000/api';
};

const API = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
});

export default API;