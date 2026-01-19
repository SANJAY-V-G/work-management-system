import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const loginUser = (username, password) => {
    return api.post('/login', { username, password });
};

export const registerUser = (username, password) => {
    return api.post('/register', { username, password });
};

export const startWork = () => {
    return api.post('/work/start');
};

export const stopWork = () => {
    return api.post('/work/stop');
};

export const getWorkLogs = () => {
    return api.get('/work/logs');
};

export const getWorkStatus = () => {
    return api.get('/work/status');
};

export const getMe = () => {
    return api.get('/me');
};
