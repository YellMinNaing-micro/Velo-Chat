import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from token claims or local storage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    // Listen to session expiry event from API interceptor
    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Parse payload to get claims (Id and Username)
      const payloadBase64 = accessToken.split('.')[1];
      const payloadJson = JSON.parse(atob(payloadBase64));
      
      // The claims mapped in TokenService
      const loggedUser = {
        id: payloadJson['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
        username: payloadJson['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        email: payloadJson['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      };

      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const register = async (username, email, password, profilePictureUrl, fullName) => {
    try {
      await api.post('/api/auth/register', {
        username,
        email,
        password,
        profilePictureUrl,
        fullName,
      });
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/revoke');
    } catch (e) {
      console.warn('Revoke token failed or was already revoked:', e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
