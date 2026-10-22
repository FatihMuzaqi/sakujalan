import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tripex_superadmin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('tripex_superadmin_token') || null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data?.success) {
        const { user: userData, accessToken } = response.data.data;
        setUser(userData);
        setToken(accessToken);
        localStorage.setItem('tripex_superadmin_token', accessToken);
        localStorage.setItem('tripex_superadmin_user', JSON.stringify(userData));
        toast.success(`Selamat datang kembali, ${userData.name}!`);
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Login SuperAdmin gagal. Cek kembali email & password.';
      toast.error(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tripex_superadmin_token');
    localStorage.removeItem('tripex_superadmin_user');
    toast.success('Berhasil keluar dari sesi SuperAdmin');
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
