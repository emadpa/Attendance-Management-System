import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Header from "./shared/Header";
import StatCard from "./shared/StatCard";
import Calendar from "./shared/Calendar";
import ScheduleCard from "./shared/ScheduleCard";
import NotificationCard from "./shared/NotificationCard";
import AttendanceMarking from "./AttendanceMarking";

export default function Dashboard() {
  const n = useNavigate();

  // State for CRUD functionality
  const [schedule, setSchedule] = useState([
    {
      id: 1,
      time: "9:00 AM",
      title: "Team Standup",
      location: "Conference Room A",
    },
    { id: 2, time: "11:30 AM", title: "Client Call", location: "Zoom" },
    { id: 3, time: "3:00 PM", title: "1:1 with Manager", location: "Office" },
  ]);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "Company picnic this Friday!",
      time: "2 hours ago",
      type: "primary",
      isRead: false, // ✅ Added isRead tracking
    },
    {
      id: 2,
      text: "Leave request approved",
      time: "5 hours ago",
      type: "success",
      isRead: true, // ✅ Set to true so you can see the difference
    },
    {
      id: 3,
      text: "Submit Q1 review by March 1",
      time: "1 day ago",
      type: "warning",
      isRead: false,
    },
  ]);

  // Mock Data
  const stats = [
    {
      label: "Attendance Rate",
      value: "92",
      suffix: "%",
      trend: 3,
      trendLabel: "vs last month",
    },
    {
      label: "Avg Clock-in",
      value: "9:15",
      suffix: " AM",
      trend: 0,
      trendLabel: "On time",
    },
    {
      label: "Avg Clock-out",
      value: "6:30",
      suffix: " PM",
      trend: 0,
      trendLabel: "On time",
    },
    {
      label: "Leave Balance",
      value: "12",
      suffix: " Days",
      trend: 0,
      trendLabel: "Remaining",
    },
  ];

  // CRUD handlers for schedule
  const addScheduleItem = () => {
    const newItem = {
      id: Date.now(),
      time: "12:00 PM",
      title: "New Event",
      location: "TBD",
    };
    setSchedule([...schedule, newItem]);
  };

  const deleteScheduleItem = (id) => {
    setSchedule(schedule.filter((item) => item.id !== id));
  };

  // CRUD handlers for notifications
  const addNotification = () => {
    const newNotif = {
      id: Date.now(),
      text: "New notification",
      time: "Just now",
      type: "primary",
      isRead: false, // ✅ New notifications start unread
    };
    setNotifications([newNotif, ...notifications]);
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter((item) => item.id !== id));
  };

  // ✅ NEW: Function to mark a notification as read
  const markAsRead = (id) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif,
      ),
    );
  };
  const markAllAsRead = () => {
    setNotifications(
      notifications.map((notif) => ({ ...notif, isRead: true })),
    );
  };
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 transition-colors duration-300">
      <Header />

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
                Good morning, John
              </h1>
              <p className="text-gray-400 font-sans text-sm sm:text-base">
                Tuesday, February 24, 2026
              </p>
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
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {stats.map((stat, i) => (
                <motion.div key={i} variants={item}>
                  <StatCard {...stat} />
                </motion.div>
              ))}
            </div>

            {/* Attendance Calendar */}
            <motion.div variants={item}>
              <Calendar />
            </motion.div>
          </div>

          {/* Sidebar (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <motion.div variants={item}>
              <ScheduleCard
                events={schedule}
                onAdd={addScheduleItem}
                onDelete={deleteScheduleItem}
              />
            </motion.div>

            <motion.div variants={item}>
              <NotificationCard
                notifications={notifications}
                onAdd={addNotification}
                onDelete={deleteNotification}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead} // ✅ Pass down the new read handler
              />
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
