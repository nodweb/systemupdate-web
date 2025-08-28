import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints with better error handling
export const authAPI = {
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      return response;
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },
  
  register: async (username: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      return response;
    } catch (error) {
      throw new Error('Registration failed. Please try again.');
    }
  },
  
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch profile.');
    }
  },
  
  updateProfile: async (data: any) => {
    try {
      const response = await api.put('/auth/profile', data);
      return response;
    } catch (error) {
      throw new Error('Failed to update profile.');
    }
  },
  
  getUsers: async () => {
    try {
      const response = await api.get('/auth/users');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch users.');
    }
  },
  
  updateUser: async (userId: number, data: any) => {
    try {
      const response = await api.put(`/auth/users/${userId}`, data);
      return response;
    } catch (error) {
      throw new Error('Failed to update user.');
    }
  },
  
  deleteUser: async (userId: number) => {
    try {
      const response = await api.delete(`/auth/users/${userId}`);
      return response;
    } catch (error) {
      throw new Error('Failed to delete user.');
    }
  },
};

export const devicesAPI = {
  getDevices: async (params?: any) => {
    try {
      const response = await api.get('/devices', { params });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch devices.');
    }
  },
  
  getDevice: async (deviceId: number) => {
    try {
      const response = await api.get(`/devices/${deviceId}`);
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device details.');
    }
  },
  
  getDeviceLogs: async (deviceId: number, params?: any) => {
    try {
      const response = await api.get(`/devices/${deviceId}/logs`, { params });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device logs.');
    }
  },
  
  getDeviceCommands: async (deviceId: number, params?: any) => {
    try {
      const response = await api.get(`/devices/${deviceId}/commands`, { params });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device commands.');
    }
  },
  
  createCommand: async (deviceId: number, data: any) => {
    try {
      const response = await api.post(`/devices/${deviceId}/commands`, data);
      return response;
    } catch (error) {
      throw new Error('Failed to create command.');
    }
  },
  
  updateDeviceStatus: async (deviceId: number, data: any) => {
    try {
      const response = await api.put(`/devices/${deviceId}/status`, data);
      return response;
    } catch (error) {
      throw new Error('Failed to update device status.');
    }
  },
  
  deleteDevice: async (deviceId: number) => {
    try {
      const response = await api.delete(`/devices/${deviceId}`);
      return response;
    } catch (error) {
      throw new Error('Failed to delete device.');
    }
  },
  
  getDeviceStats: async () => {
    try {
      const response = await api.get('/devices/stats');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device statistics.');
    }
  },
  
  searchDevices: async (query: string) => {
    try {
      const response = await api.get('/devices/search', { params: { q: query } });
      return response;
    } catch (error) {
      throw new Error('Failed to search devices.');
    }
  },
};

export const websocketAPI = {
  sendCommand: async (data: any) => {
    try {
      const response = await api.post('/websocket/command', data);
      return response;
    } catch (error) {
      throw new Error('Failed to send command via WebSocket.');
    }
  },
  
  broadcastCommand: async (data: any) => {
    try {
      const response = await api.post('/websocket/broadcast', data);
      return response;
    } catch (error) {
      throw new Error('Failed to broadcast command.');
    }
  },
};

export const analyticsAPI = {
  getOverview: async (days?: number) => {
    try {
      const response = await api.get('/analytics/overview', { params: { days } });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch analytics overview.');
    }
  },
  
  getDeviceActivity: async (days?: number) => {
    try {
      const response = await api.get('/analytics/device-activity', { params: { days } });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device activity.');
    }
  },
  
  getCommandAnalytics: async (days?: number) => {
    try {
      const response = await api.get('/analytics/command-analytics', { params: { days } });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch command analytics.');
    }
  },
  
  getDevicePerformance: async () => {
    try {
      const response = await api.get('/analytics/device-performance');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch device performance.');
    }
  },
  
  getDataCollectionStats: async (days?: number) => {
    try {
      const response = await api.get('/analytics/data-collection-stats', { params: { days } });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch data collection statistics.');
    }
  },
  
  getErrorAnalysis: async (days?: number) => {
    try {
      const response = await api.get('/analytics/error-analysis', { params: { days } });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch error analysis.');
    }
  },
  
  getRealTimeMetrics: async () => {
    try {
      const response = await api.get('/analytics/real-time-metrics');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch real-time metrics.');
    }
  },
}; 