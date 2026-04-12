import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";

import socket from "./socket";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import BiometricSetup from "./pages/BiometricSetup";

// ─── Auth Context ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API = "http://localhost:8080/api";

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          color: "#94a3b8",
          fontSize: 14,
          background: "#f8fafc",
        }}
      >
        Checking session…
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (user?.requiresBiometric) {
    return <Navigate to="/biometric-setup" replace />;
  }

  return children;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch & bootstrap session ─────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      const data = res.data;

      if (!data) {
        setUser(null);

        setLoading(false);
        return;
      }

      setUser(data);

      socket.disconnect();
      socket.connect();
      socket.emit("join_room", data.user.id);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => socket.disconnect();
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {
    } finally {
      setUser(null);

      socket.disconnect();
    }
  };
  // console.log(user);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/biometric-setup"
          element={user ? <BiometricSetup /> : <Navigate to="/" replace />}
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <MainLayout user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
