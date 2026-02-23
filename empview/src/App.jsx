import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import AttendanceMarking from "./components/AttendanceMarking";

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/MarkAttendance" element={<AttendanceMarking />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
