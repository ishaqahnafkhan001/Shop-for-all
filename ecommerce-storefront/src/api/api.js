import axios from 'axios';

// src/api/api.js

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

export default API;
