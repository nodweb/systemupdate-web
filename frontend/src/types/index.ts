export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  ipAddress: string;
  osVersion: string;
  appVersion: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

export interface UpdatePackage {
  id: string;
  name: string;
  version: string;
  description: string;
  releaseDate: string;
  fileSize: number;
  checksum: string;
  isRequired: boolean;
  isRollout: boolean;
  rolloutPercentage: number;
  compatibleDevices: string[];
  changelog: string;
}

export interface Deployment {
  id: string;
  name: string;
  description: string;
  updatePackageId: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  targetDevices: string[];
  completedDevices: string[];
  failedDevices: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}

export interface FilterOption {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: SortOption[];
  filter?: FilterOption[];
  search?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface MenuItem {
  id: string;
  title: string;
  path?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  roles?: string[];
  permissions?: string[];
  divider?: boolean;
  external?: boolean;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AppState {
  theme: {
    mode: 'light' | 'dark';
  };
  notifications: Notification[];
  sidebar: {
    open: boolean;
    width: number;
    collapsedWidth: number;
  };
  loading: boolean;
  error: string | null;
}
