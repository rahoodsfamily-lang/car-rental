import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set up axios default headers
  useEffect(() => {
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (token) {
        try {
          const res = await axiosInstance.get('/api/users/profile');
          setUser(res.data.user);
        } catch (err) {
          console.error('Error verifying token:', err);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axiosInstance.post('/api/users/login', { email, password });
      const { token, user } = res.data;
      
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      
      return { success: true, message: res.data.message, user };
    } catch (err) {
      // Check if error is due to unverified email
      if (err.response?.data?.requiresVerification) {
        return {
          success: false,
          message: err.response.data.message,
          requiresVerification: true,
          email: err.response.data.email
        };
      }
      
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (email, password, firstName, lastName, phone) => {
    try {
      const res = await axiosInstance.post('/api/users/register', {
        email,
        password,
        firstName,
        lastName,
        phone
      });
      
      // New flow: Registration sends verification email, no immediate login
      // Check if response requires verification
      if (res.data.requiresVerification) {
        return { 
          success: true, 
          message: res.data.message,
          requiresVerification: true,
          email: res.data.email
        };
      }
      
      // Old flow: If token is provided (backward compatibility)
      const { token, user } = res.data;
      if (token && user) {
        setToken(token);
        setUser(user);
        localStorage.setItem('token', token);
        return { success: true, message: res.data.message, user };
      }
      
      // Default success response
      return { success: true, message: res.data.message };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axiosInstance.put('/api/users/profile', profileData);
      setUser(res.data.user);
      return { success: true, message: res.data.message, user };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Profile update failed' 
      };
    }
  };

  const updateProfilePicture = (profilePicture) => {
    setUser(prevUser => ({
      ...prevUser,
      profile: {
        ...prevUser.profile,
        profilePicture
      }
    }));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updateProfilePicture,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
