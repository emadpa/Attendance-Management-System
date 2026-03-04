import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Header from "./shared/Header";
import StatCard from "./shared/StatCard";
import Calendar from "./shared/Calendar";
import ScheduleCard from "./shared/ScheduleCard";
import NotificationCard from "./shared/NotificationCard";
import { useAuth } from "../App";
import socket from "../socket";

const API = "http://localhost:5000/api/employee";

export default function Dashboard() {
  const n = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatNotifTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (isToday) return `Today ${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${time}`;
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, scheduleRes, notifRes] = await Promise.all([
          axios.get(`${API}/dashboard`, { withCredentials: true }),
          axios.get(`${API}/today-schedule`, { withCredentials: true }),
          axios.get(`${API}/notifications`, { withCredentials: true }),
        ]);
        // console.log(scheduleRes.data);
        const notifs = notifRes.data.data || [];
        setNotifications(
          notifs.map((n) => ({
            id: n.id,
            text: `${n.title}: ${n.message}`,
            time: formatNotifTime(n.createdAt),
            isRead: n.isRead,
          })),
        );

        setDashboardData(dashRes.data);

        // Map tasks from backend to ScheduleCard format
        const tasks = scheduleRes.data.data?.tasks || [];
        setSchedule(
          tasks.map((task, i) => ({
            id: i,
            time: task.time || "—",
            title: task.title || task.name || "Task",
            duration: task.duration || "—",
            description: task.description || "—",
          })),
        );
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);
  useEffect(() => {
    socket.on("new_notification", (data) => {
      setNotifications((prev) => [
        {
          id: data.id,
          text: `${data.title}: ${data.message}`,
          time: formatNotifTime(data.createdAt),
          isRead: false,
        },
        ...prev,
      ]);
    });

    return () => socket.off("new_notification");
  }, []);

  const markNotificationRead = async (id) => {
    console.log(id);
    try {
      await axios.patch(
        `${API}/notifications/${id}/read`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch(
        `${API}/notifications/read-all`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };
  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Build stats from real dashboard data
  const stats = dashboardData
    ? [
        {
          label: "Attendance Rate",
          value: dashboardData.attendance.yearlyPercentage,
          suffix: "%",
          trendLabel: "This year",
        },
        {
          label: "Avg Clock-in",
          value: dashboardData.attendance.avgPunchIn || "—",
          suffix: "",
          trendLabel: "",
        },
        {
          label: "Avg Clock-out",
          value: dashboardData.attendance.avgPunchOut || "—",
          suffix: "",

          trendLabel: "Ae",
        },
        {
          label: "Leave Balance",
          value:
            dashboardData.leaveBalances.find((l) =>
              l.type.toLowerCase().includes("casual"),
            )?.remaining ??
            dashboardData.leaveBalances[0]?.remaining ??
            "—",
          suffix: " Days",
          trendLabel: "Remaining",
        },
      ]
    : [];

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 font-sans">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500 font-sans">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 transition-colors duration-300">
      <Header
        name={dashboardData?.user?.name}
        organizationName={dashboardData?.user?.organization?.name}
      />

      <main className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
        {/* Hero Section */}
        <motion.section
          className="py-6 sm:py-12 mb-6 sm:mb-12 border-b border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-2 dark:text-white">
                {greeting},{" "}
                {dashboardData?.user?.name || user?.name || "Employee"}
              </h1>
              <p className="text-gray-400 font-sans text-sm sm:text-base">
                {today}
              </p>
              {dashboardData?.user?.designation && (
                <p className="text-gray-500 dark:text-gray-400 font-sans text-xs mt-1">
                  {dashboardData.user.designation} ·{" "}
                  {dashboardData.user.department?.name}
                </p>
              )}
            </div>

            <motion.button
              className="w-full sm:w-auto group relative overflow-hidden bg-black dark:bg-white text-white dark:text-black px-6 sm:px-8 py-3 sm:py-4 rounded-md"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => n("/MarkAttendance")}
            >
              <div className="relative z-10 flex items-center gap-4">
                <div className="text-left">
                  <p className="text-white/60 dark:text-black/60 text-[10px] uppercase tracking-widest font-sans mb-1">
                    Quick Action
                  </p>
                  <p className="text-lg sm:text-xl font-serif">
                    Mark Attendance
                  </p>
                </div>
                <div className="text-2xl group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
            </motion.button>
          </div>
        </motion.section>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {stats.map((stat, i) => (
                <motion.div key={i} variants={item}>
                  <StatCard {...stat} />
                </motion.div>
              ))}
            </div>

            <motion.div variants={item}>
              <Calendar />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <motion.div variants={item}>
              <ScheduleCard
                events={schedule}
                onAdd={() => {}}
                onDelete={() => {}}
              />
            </motion.div>

            <motion.div variants={item}>
              <NotificationCard
                notifications={notifications}
                onDelete={deleteNotification}
                onMarkAsRead={markNotificationRead}
                onMarkAllAsRead={markAllAsRead}
              />
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
