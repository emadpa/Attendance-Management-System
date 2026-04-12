import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import Icon from "../ui/icons/Icon";
import { Icons } from "../ui/icons/iconPaths";
import socket from "../../socket";
import NotificationDropdown from "../NotificationDropdown";

import { useIsMobile } from "../../hooks/useIsMobile";

import { PORT } from "../../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNotifTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  if (date.toDateString() === yesterday.toDateString())
    return `Yesterday ${time}`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${time}`;
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
export default function TopBar({ name, onMenuClick }) {
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchNotifs = async () => {
      try {
        const res = await axios.get(`${API}/notifications`, {
          withCredentials: true,
        });
        if (cancelled) return;
        setNotifications(
          (res.data.data || []).map((no) => ({
            id: no.id,
            text: `${no.title}: ${no.message}`,
            time: formatNotifTime(no.createdAt),
            isRead: no.isRead,
          })),
        );
      } catch {
        // silently fail — topbar shouldn't crash the app
      }
    };
    fetchNotifs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Socket listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (data) => {
      setNotifications((prev) => [
        {
          id: data.id,
          text: `${data.title}: ${data.message}`,
          time: formatNotifTime(data.createdAt),
          isRead: false,
        },
        ...prev,
      ]);
    };
    socket.off("new_notification", handler);
    socket.on("new_notification", handler);
    return () => socket.off("new_notification", handler);
  }, []);

  // ── Close dropdown on outside click (desktop) ────────────────────────────
  useEffect(() => {
    if (isMobile) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isMobile]);

  // ── Notification actions ──────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      await axios.patch(
        `${API}/notifications/${id}/read`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {}
  };

  const markAll = async () => {
    try {
      await axios.patch(
        `${API}/notifications/read-all`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const deleteNotif = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Greeting ──────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-6 relative">
      {/* Left — hamburger + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center
                     bg-white border border-slate-100 text-slate-500
                     shadow-sm hover:bg-slate-50 transition"
        >
          <Icon d={Icons.menu} size={18} />
        </button>

        <div>
          <h1 className="text-[clamp(17px,2.5vw,23px)] font-bold text-slate-900 font-serif leading-tight m-0">
            {greeting}, {name || "Employee"} 👋
          </h1>
          <p className="hidden sm:block text-xs text-slate-400 mt-1 font-sans">
            {today}
          </p>
        </div>
      </div>

      {/* Right — bell + avatar */}
      <div className="flex items-center gap-2">
        {/* Bell wrapper — relative anchor for dropdown */}
        <div ref={wrapperRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen((o) => !o)}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center
              transition-all duration-150 shadow-sm border cursor-pointer
              ${
                isOpen
                  ? "bg-indigo-50 border-indigo-200 text-indigo-500"
                  : "bg-white border-slate-100 text-slate-500"
              }`}
          >
            <Icon d={Icons.bell} size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-[3px]
                               rounded-full bg-red-500 text-white text-[9px]
                               font-bold flex items-center justify-center
                               border-2 border-slate-50"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <NotificationDropdown
                notifications={notifications}
                onMarkRead={markRead}
                onMarkAll={markAll}
                onDelete={deleteNotif}
                onClose={() => setIsOpen(false)}
                isMobile={isMobile}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center
                        text-white text-sm font-bold shrink-0
                        bg-gradient-to-br from-indigo-500 to-pink-500"
        >
          {(name || "U")[0].toUpperCase()}
        </div>
      </div>
    </div>
  );
}
