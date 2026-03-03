import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../shared/AuthContext";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Bell,
  CalendarClock,
  Settings,
  LogOut,
  Clock,
  Menu,
  X,
  PieChart,
  Building,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AdminLayout({ title, description, actions, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ✅ Extract 'user' from your AuthContext
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
    { label: "Employees", to: "/admin/employees", icon: Users },
    { label: "Reports", to: "/admin/reports", icon: PieChart },
    { label: "Departments", to: "/admin/departments", icon: Building },
    { label: "Leaves", to: "/admin/leaves", icon: CalendarDays },
    { label: "Shifts", to: "/admin/shifts", icon: Clock },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
    { label: "Schedules", to: "/admin/schedules", icon: CalendarClock },
  ];

  const SidebarContent = () => (
    <>
      <div>
        <div className="mb-16 px-3 flex items-center gap-2">
          <div className="h-8 w-8 bg-black rounded-full flex-shrink-0" />
          {/* ✅ Changed to line-clamp-2 and leading-tight for graceful wrapping */}
          <span
            className="text-lg font-serif font-bold tracking-tight leading-tight line-clamp-2"
            title={user?.orgName || "Dashboard"}
          >
            {user?.orgName || "Dashboard"}
          </span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between w-full text-left px-3 py-2 rounded-md transition-all duration-200 group",
                  isActive
                    ? "bg-gray-100/80 text-black font-medium"
                    : "text-gray-500 hover:text-black hover:bg-gray-50",
                )
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="w-4 h-4 opacity-70" />
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="space-y-2 text-sm text-gray-400 px-3">
        <NavLink
          to="/admin/settings/admins"
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 w-full text-left transition-colors py-2 rounded-md px-3 -mx-3",
              isActive
                ? "bg-gray-100/80 text-black font-medium"
                : "hover:text-black hover:bg-gray-50",
            )
          }
        >
          <Settings className="w-4 h-4" />
          <span>Admin Settings</span>
        </NavLink>

        <NavLink
          to="/admin/settings/organization"
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 w-full text-left transition-colors py-2 rounded-md px-3 -mx-3",
              isActive
                ? "bg-gray-100/80 text-black font-medium"
                : "hover:text-black hover:bg-gray-50",
            )
          }
        >
          <Building2 className="w-4 h-4" />
          <span>Org Settings</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left hover:text-black transition-colors py-2 px-3 -mx-3 rounded-md hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-6 left-4 z-50 p-2 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      <aside className="hidden lg:flex w-64 border-r border-gray-200 py-12 px-8 flex-col justify-between fixed h-full bg-white/50 backdrop-blur-sm z-10">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 py-12 px-8 flex flex-col justify-between z-50 shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 py-6 px-4 sm:py-8 sm:px-6 lg:py-12 lg:px-12 lg:ml-64">
        <header className="mb-8 lg:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-3xl sm:text-4xl font-serif leading-none mb-2 sm:mb-3 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm sm:text-base text-gray-500 max-w-2xl leading-relaxed font-light">
                {description}
              </p>
            )}
          </div>
          <div className="flex gap-3 pl-12 lg:pl-0">{actions}</div>
        </header>
        {children}
      </main>
    </div>
  );
}
