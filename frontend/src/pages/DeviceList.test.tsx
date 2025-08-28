import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DeviceList from './DeviceList';
import { AuthProvider } from '../contexts/AuthContext';
import * as deviceService from '../services/deviceService';

jest.mock('../services/deviceService');

const mockDevices = [
  {
    id: 1,
    device_id: 'dev-001',
    device_name: 'Test Device',
    manufacturer: 'TestCo',
    model: 'T1000',
    is_connected: true,
    security_level: 'high',
  },
  {
    id: 2,
    device_id: 'dev-002',
    device_name: 'Device 2',
    manufacturer: 'BrandX',
    model: 'X200',
    is_connected: false,
    security_level: 'medium',
  },
];

describe('DeviceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator initially', async () => {
    (deviceService.getDevices as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <AuthProvider>
        <DeviceList />
      </AuthProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders devices after loading', async () => {
    (deviceService.getDevices as jest.Mock).mockResolvedValue({ devices: mockDevices, pagination: { page: 1, per_page: 10, total: 2, pages: 1, has_next: false, has_prev: false } });
    render(
      <AuthProvider>
        <DeviceList />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('Test Device')).toBeInTheDocument());
    expect(screen.getByText('Device 2')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    (deviceService.getDevices as jest.Mock).mockRejectedValue(new Error('Fetch error'));
    render(
      <AuthProvider>
        <DeviceList />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText(/خطا در دریافت دستگاه‌ها/)).toBeInTheDocument());
  });

  it('filters devices by search', async () => {
    (deviceService.getDevices as jest.Mock).mockResolvedValue({ devices: mockDevices, pagination: { page: 1, per_page: 10, total: 2, pages: 1, has_next: false, has_prev: false } });
    render(
      <AuthProvider>
        <DeviceList />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('Test Device')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText(/جستجو/i);
    fireEvent.change(searchInput, { target: { value: 'Device 2' } });
    fireEvent.submit(searchInput);
    await waitFor(() => expect(screen.getByText('Device 2')).toBeInTheDocument());
  });
}); 