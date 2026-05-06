import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:4000/api', // Your Node.js backend URL
    withCredentials: true,
});

export default API;