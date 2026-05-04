import axios from 'axios';

// Create a centralized Axios instance
const API = axios.create({
    // Vite uses import.meta.env to read variables
    baseURL: import.meta.env.VITE_API_URL,

    // CRITICAL: This ensures your secure HttpOnly cookies are sent with every request
    withCredentials: true,
});

// Optional: Add Interceptors here later if you need to catch global errors
// (like a 401 Unauthorized to force log the user out)
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Unauthorized request or session expired.");
            // FIX: Kick the user back to the login screen
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API;