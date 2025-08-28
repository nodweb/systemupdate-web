/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const login = async (username: string, password: string) => axios.post(`${API_URL}/auth/login`, { username, password });

export const register = async (username: string, email: string, password: string) => axios.post(`${API_URL}/auth/register`, { username, email, password });

export const logout = async () => 
  // Optionally, call a logout endpoint if available
   Promise.resolve()
; 