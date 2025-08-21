import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login as loginAction, logout as logoutAction, selectCurrentUser } from '../store/slices/authSlice';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check for existing token and validate it on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
          // Verify token expiration
          const decodedToken = jwtDecode<User & { exp: number }>(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token expired, try to refresh
            const refreshed = await refreshToken();
            if (!refreshed) {
              await logout();
            }
          } else {
            // Token is valid, set up axios headers
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.login({ username, password });
      const { accessToken, refreshToken, user } = response.data;
      
      // Store tokens in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Set axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      // Update Redux store
      dispatch(loginAction({ user, accessToken, refreshToken }));
      
      // Redirect to dashboard or intended page
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API if needed
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      
      // Update Redux store
      dispatch(logoutAction());
      
      // Redirect to login
      navigate('/login');
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.refreshToken({ refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      // Update tokens in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Update axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
