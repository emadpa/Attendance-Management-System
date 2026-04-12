import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import axios from "axios";

import QuickActions from "../components/dashboard/QuickActions";
import AttendanceTimeline from "../components/dashboard/AttendanceTimeline";
import WeeklyHoursChart from "../components/dashboard/WeeklyHoursChart";
import AttendanceStatus from "../components/AttendanceStatus";

import { Icons } from "../components/ui/icons/iconPaths";
import Loading from "../components/Loading";

import { PORT } from "../constants/port";
const API = `http://localhost:${PORT}/api/employee`;

export default function Dashboard({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes] = await Promise.all([
          axios.get(`${API}/dashboard`, { withCredentials: true }),
        ]);

        setDashboardData(dashRes.data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = dashboardData
    ? [
        {
          label: "Attendance Rate",
          value: dashboardData.attendance.yearlyPercentage,
          suffix: "%",
          trendLabel: "This year",
          icon: Icons.check,
          accent: "#6366f1",
          delta: 2,
        },
        {
          label: "Avg Clock-In",
          value: dashboardData.attendance.avgPunchIn || "—",
          suffix: "",
          trendLabel: "",
          icon: Icons.clock,
          accent: "#10b981",
        },
        {
          label: "Avg Clock-Out",
          value: dashboardData.attendance.avgPunchOut || "—",
          suffix: "",
          trendLabel: "",
          icon: Icons.clock,
          accent: "#f59e0b",
        },
        {
          label: "Leave Balance",
          value:
            dashboardData.leaveBalances?.find((l) =>
              l.type.toLowerCase().includes("casual"),
            )?.remaining ??
            dashboardData.leaveBalances?.[0]?.remaining ??
            "—",
          suffix: "d",
          trendLabel: "Remaining",
          icon: Icons.leave,
          accent: "#8b5cf6",
          delta: -1,
        },
      ]
    : [];

  if (loading) return <Loading />;

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <p style={{ color: "#ef4444", fontFamily: "'DM Sans',sans-serif" }}>
          {error}
        </p>
      </div>
    );

  return (
    <>
      {/* Attendance Status - Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5"
      >
        <AttendanceStatus />
      </motion.div>

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div> */}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        className="mb-5"
      >
        <p className="text-[11px] font-semibold text-slate-400 tracking-[0.08em] uppercase mb-[10px]">
          Quick Actions
        </p>
        <QuickActions onNavigate={onNavigate} />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54 }}
        >
          <AttendanceTimeline />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <WeeklyHoursChart />
        </motion.div>
      </div>
    </>
  );
}
