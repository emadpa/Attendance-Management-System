import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// ✅ CRITICAL: Tell Axios to send the HTTP-Only cookie with every single request
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);
const API_URL = "http://localhost:5000/api/auth";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load: Check if logged in
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await axios.get(`${API_URL}/me`);
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  // 2. Axios Interceptor: Kick user out if token expires while using the app
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setUser(null);

          // ✅ ADDED THIS: Grab the error message and put it in the URL
          const errorMessage =
            error.response.data?.error ||
            error.response.data?.message ||
            "Session expired. Please log in again.";

          if (window.location.pathname !== "/login") {
            window.location.href = `/login?error=${encodeURIComponent(errorMessage)}`;
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const register = async (orgName, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/register`, {
        orgName,
        email,
        password,
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/logout`);
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
