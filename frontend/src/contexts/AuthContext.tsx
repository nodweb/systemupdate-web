import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const decoded = jwtDecode<User & { exp: number }>(token);
          
          // Check if token is expired
          if (decoded.exp * 1000 < Date.now()) {
            const refreshed = await refreshToken();
            if (!refreshed) {
              logout();
            }
          } else {
            setUser(decoded);
            // Set up axios auth header
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { accessToken, refreshToken } = response.data;
      
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Set up axios auth header
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      
      // Set user data
      const userData = jwtDecode<User>(accessToken);
      setUser(userData);
      
      // Redirect to home or intended page
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    // Clear tokens and user data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
    
    // Redirect to login
    navigate('/login');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;
      
      const response = await api.post('/auth/refresh-token', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      // Update tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Update axios header
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      
      // Update user data
      const userData = jwtDecode<User>(accessToken);
      setUser(userData);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
