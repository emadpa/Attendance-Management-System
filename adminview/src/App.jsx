import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./components/shared/AuthContext";
import { AdminLogin } from "./components/Admin/AdminLogin";
import { AdminRegister } from "./components/Admin/AdminRegister";
import { AdminOverview } from "./components/Admin/AdminOverview";
import { AdminLeaves } from "./components/Admin/AdminLeaves";
import { AdminEmployees } from "./components/Admin/AdminEmployees";
import { AdminNotifications } from "./components/Admin/AdminNotifications";
import { AdminSchedules } from "./components/Admin/AdminSchedules";
import { AdminLayout } from "./components/Admin/AdminLayout";
import { DepartmentManagement } from "./components/Admin/DepartmentManagement";
import { ManageAdmins } from "./components/Admin/ManageAdmins"; // ✅ IMPORTED THIS
import { OrganizationSettings } from "./components/Admin/OrganizationSettings";
import { AdminAttendanceCorrection } from "./components/Admin/AdminAttendanceCorrection";
import { AdminShifts } from "./components/Admin/AdminShifts";
import { AdminReports } from "./components/Admin/AdminReports";

// 1. Protects dashboard pages (Only logged-in users allowed)
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/" element={<AdminLogin />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/register" element={<AdminRegister />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/admin">
              <Route index element={<AdminOverview />} />
              <Route path="leaves" element={<AdminLeaves />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="reports" element={<AdminReports />} />
              <Route
                path="attendance"
                element={<AdminAttendanceCorrection />}
              />
              <Route path="shifts" element={<AdminShifts />} />
              {/* Departments Route */}
              <Route
                path="departments"
                element={
                  <AdminLayout
                    title="Departments"
                    description="Manage organizational structure and assign department heads."
                  >
                    <DepartmentManagement />
                  </AdminLayout>
                }
              />

              {/* ✅ ADDED: Admin Settings / Manage Admins Route */}
              <Route
                path="settings/admins"
                element={
                  <AdminLayout
                    title="Admin Access"
                    description="Manage dashboard access and role-based permissions."
                  >
                    <ManageAdmins />
                  </AdminLayout>
                }
              />

              {/* 2. Organization Settings Route */}
              <Route
                path="settings/organization"
                element={
                  <AdminLayout
                    title="Organization Settings"
                    description="Configure your company details, time zones, and attendance geofencing rules."
                  >
                    <OrganizationSettings />
                  </AdminLayout>
                }
              />

              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="schedules" element={<AdminSchedules />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
