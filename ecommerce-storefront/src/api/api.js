import axios from 'axios';

// src/api/api.js

const getBaseUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        // ✨ FIX: Use .includes('localhost') so it catches 'apple.localhost'
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            return `http://localhost:4000/api`; // Always point to the base localhost API
        }

        if (host.includes('scaleup.codes')) {
            return 'https://api.scaleup.codes/api';
        }

        return `https://${host}/api`;
    }

    return 'http://localhost:4000/api';
};
const API = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
});

export default API;