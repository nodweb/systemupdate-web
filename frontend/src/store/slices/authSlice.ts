import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Load initial state from localStorage if available
const loadInitialState = (): AuthState => {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const user = localStorage.getItem('user');
  
  return {
    user: user ? JSON.parse(user) : null,
    token,
    refreshToken,
    isAuthenticated: !!token,
    isLoading: false,
    error: null,
  };
};

const initialState: AuthState = loadInitialState();

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as { auth: AuthState };
      if (!auth.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.refreshToken({ refreshToken: auth.refreshToken });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to refresh token');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      
      // Save to localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Reset API state
      api.util.resetApiState();
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(loginUser.fulfilled, (state, action) => {
      const { accessToken, refreshToken, user } = action.payload;
      state.isLoading = false;
      state.isAuthenticated = true;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.user = user;
      
      // Save to localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    });
    
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // Refresh Token
    builder.addCase(refreshToken.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    
    builder.addCase(refreshToken.fulfilled, (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      state.isLoading = false;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      
      // Update localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    });
    
    builder.addCase(refreshToken.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      
      // Clear localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
