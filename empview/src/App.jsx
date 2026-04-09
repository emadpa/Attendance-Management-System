// import { Routes, Route, Navigate } from "react-router-dom";
// import { ThemeProvider } from "./context/ThemeContext";
// import { useState, useEffect, createContext, useContext } from "react";
// import LoginPage from "./components/LoginPage";
// import Dashboard from "./components/Dashboard";
// import AttendanceMarking from "./components/AttendanceMarking";
// import socket from "./socket"; // ✅ import socket

// export const AuthContext = createContext(null);
// export const useAuth = () => useContext(AuthContext);

// function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();
//   if (loading)
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         Checking session...
//       </div>
//     );
//   return user ? children : <Navigate to="/" replace />;
// }

// function App() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetch("http://localhost:5000/api/auth/me", {
//       credentials: "include",
//     })
//       .then((res) => (res.ok ? res.json() : null))
//       .then((data) => {
//         setUser(data || null);
//         setLoading(false);

//         // ✅ Connect socket and join room once we confirm user is logged in

//         if (data) {
//           socket.connect();
//           socket.emit("join_room", data.user.id);
//         }
//       })
//       .catch(() => {
//         setUser(null);
//         setLoading(false);
//       });

//     // ✅ Disconnect socket when app unmounts / user closes tab
//     return () => {
//       socket.disconnect();
//     };
//   }, []);

//   return (
//     <AuthContext.Provider value={{ user, setUser, loading }}>
//       <ThemeProvider>
//         <Routes>
//           <Route path="/" element={<LoginPage />} />
//           <Route
//             path="/Dashboard"
//             element={
//               <ProtectedRoute>
//                 <Dashboard />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/MarkAttendance"
//             element={
//               <ProtectedRoute>
//                 <AttendanceMarking />
//               </ProtectedRoute>
//             }
//           />
//         </Routes>
//       </ThemeProvider>
//     </AuthContext.Provider>
//   );
// }

// export default App;
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { useState, useEffect, createContext, useContext } from "react";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import AttendanceMarking from "./components/AttendanceMarking";
import BiometricSetup from "./components/BiometricSetup";
import socket from "./socket";

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking session...
      </div>
    );

  if (!user) return <Navigate to="/" replace />;

  // Block access to dashboard until biometric is done
  // requiresBiometric is top-level: { user: {...}, requiresBiometric: true }
  if (user?.requiresBiometric) {
    return <Navigate to="/biometric-setup" replace />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/auth/me", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data || null);
        setLoading(false);

        if (data) {
          socket.connect();
          socket.emit("join_room", data.user.id); // data.user.id is correct
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    return () => socket.disconnect();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* Biometric setup route - accessible only when logged in */}
          <Route
            path="/biometric-setup"
            element={user ? <BiometricSetup /> : <Navigate to="/" replace />}
          />

          <Route
            path="/Dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/MarkAttendance"
            element={
              <ProtectedRoute>
                <AttendanceMarking />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

export default App;
