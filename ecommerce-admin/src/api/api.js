import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

API.interceptors.response.use(
    (response) => response,
    (error) => {

        if (error.response?.status === 401) {
            console.warn('Unauthorized or session expired');
        }

        return Promise.reject(error);
    }
);

export default API;