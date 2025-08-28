import axios from 'axios';

declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Device {
  id: number;
  device_id: string;
  device_name?: string;
  manufacturer?: string;
  model?: string;
  android_version?: string;
  is_connected?: boolean;
  last_seen?: string;
  battery_level?: number;
  security_level?: string;
}

export interface DeviceListResponse {
  devices: Device[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const getDevices = async (token: string, page = 1, per_page = 20): Promise<DeviceListResponse> => {
  const res = await axios.get(`${API_URL}/devices`, {
    params: { page, per_page },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}; 