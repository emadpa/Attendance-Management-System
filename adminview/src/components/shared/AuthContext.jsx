import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem("adminUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Mock login - in a real app, this would verify against a backend
    // For now, we'll check if there's a registered user in localStorage
    const registeredUserStr = localStorage.getItem("registeredAdmin");

    if (registeredUserStr) {
      const registeredUser = JSON.parse(registeredUserStr);
      if (
        registeredUser.email === email &&
        registeredUser.password === password
      ) {
        const userData = { ...registeredUser, isAuthenticated: true };
        setUser(userData);
        localStorage.setItem("adminUser", JSON.stringify(userData));
        return { success: true };
      }
    }

    // Fallback for testing if no user registered yet
    if (email === "admin@company.com" && password === "admin123") {
      const userData = { email, orgName: "Demo Corp", isAuthenticated: true };
      setUser(userData);
      localStorage.setItem("adminUser", JSON.stringify(userData));
      return { success: true };
    }

    return { success: false, message: "Invalid credentials" };
  };

  const register = (orgName, email, password) => {
    // Mock registration
    const newUser = { orgName, email, password };
    localStorage.setItem("registeredAdmin", JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("adminUser");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
