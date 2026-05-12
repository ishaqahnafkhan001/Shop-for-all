// src/api/api.js (or wherever your Axios instance is)
import axios from 'axios';

// 🌟 Get the current hostname dynamically (e.g., 'byte101.localhost' or 'localhost')
// We check for 'window' so Next.js doesn't crash during Server-Side Rendering
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const API = axios.create({
    // 🌟 Point the API to the exact same host, just on port 4000
    baseURL: `http://${currentHost}:4000/api`,
    withCredentials: true,
});

export default API;