import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../App";
import { useIsMobile } from "../hooks/useIsMobile";
import { PORT } from "../constants/port";
import ScheduleModal from "../components/ScheduleModal";

const API = `http://localhost:${PORT}/api/employee`;

/* ─────────────────────────────────────────────
   Work type meta
───────────────────────────────────────────── */
const WORK_TYPE_META = {
  OFFICE: {
    label: "Office",
    color: "#6366f1",
    bg: "#eef2ff",
    border: "#c7d2fe",
    dot: "#6366f1",
    icon: "🏢",
  },
  REMOTE: {
    label: "Remote",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
    dot: "#0891b2",
    icon: "🏠",
  },
  HYBRID: {
    label: "Hybrid",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    dot: "#7c3aed",
    icon: "🔄",
  },
  FIELD: {
    label: "Field",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    dot: "#059669",
    icon: "📍",
  },
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function dateKey(year, month0, day) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function todayKey() {
  const n = new Date();
  return dateKey(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * "past"    — strictly before today → view-only
 * "present" — today                 → view + manage
 * "future"  — after today           → view + manage
 */
function getDayKind(year, month0, day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(year, month0, day);
  if (d < today) return "past";
  if (d.getTime() === today.getTime()) return "present";
  return "future";
}

/* ─────────────────────────────────────────────
   TaskPill
───────────────────────────────────────────── */
function TaskPill({ task, color }) {
  const [open, setOpen] = useState(false);
  const hasDescription = !!task.description;

  return (
    <div
      className="rounded-[10px] border transition-all overflow-hidden"
      style={{ borderColor: `${color}22`, background: `${color}07` }}
    >
      <button
        onClick={() => hasDescription && setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 group"
      >
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
          style={{ background: color }}
        />

        <span className="flex-1 text-[12.5px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors font-[DM_Sans]">
          {task.title || "Untitled task"}
        </span>

        {task.time && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 font-[DM_Sans]"
            style={{ background: `${color}18`, color }}
          >
            <svg
              width="10"
              height="10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {fmtTime(task.time)}
          </span>
        )}

        {task.duration && (
          <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 font-[DM_Sans]">
            {task.duration}m
          </span>
        )}

        {hasDescription && (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex-shrink-0"
            style={{ color }}
          >
            <svg
              width="11"
              height="11"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && task.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p className="text-[11.5px] text-slate-400 px-3 pb-2.5 pl-[26px] font-[DM_Sans] leading-relaxed">
              {task.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DayDetailPanel

   dayKind  action button shown
   ──────── ───────────────────
   "past"   none — lock notice at bottom
   "present" "Manage Tasks" → opens modal
   "future"  "Manage Tasks" → opens modal
───────────────────────────────────────────── */
function DayDetailPanel({
  day,
  month0,
  year,
  record,
  dayKind,
  onClose,
  onOpenModal,
}) {
  const dk = dateKey(year, month0, day);
  const tasks = Array.isArray(record?.tasks)
    ? record.tasks.filter((t) => t.title)
    : [];

  const canEdit = dayKind === "present" || dayKind === "future";

  const label = new Date(year, month0, day).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const kindBadge = {
    past: { text: "Past · View only", color: "#94a3b8" },
    present: { text: "Today", color: "#6366f1" },
    future: { text: "Upcoming", color: "#059669" },
  }[dayKind];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mx-5 mb-5 rounded-[16px] border overflow-hidden"
      style={{ borderColor: "#c7d2fe" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: "#6366f110",
          borderBottom: `1px solid #c7d2fe`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{"📅"}</span>
          <div>
            <p className="text-[13px] font-bold text-slate-800 font-[DM_Sans] leading-tight">
              {label}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[9px] font-bold tracking-widest uppercase font-[DM_Sans]"
                style={{ color: kindBadge.color }}
              >
                {kindBadge.text}
              </span>
              {tasks.length > 0 && (
                <span
                  className="text-[9px] font-bold tracking-wider uppercase font-[DM_Sans]"
                  style={{ color: kindBadge.color }}
                >
                  · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {canEdit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onOpenModal(record, dk)}
              className="flex items-center gap-0.5 md:gap-1.5 h-[30px] px-1 md:px-3 rounded-[8px] text-[7px] md:text-[10.5px] font-bold transition font-[DM_Sans]"
              style={{
                background: "#eef2ff",
                color: "#6366f1",
                border: "1px solid #c7d2fe",
              }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Manage Tasks
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3" style={{ background: "#eef2ff" }}>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-2xl">📋</span>
            <p className="text-[12px] text-slate-400 font-[DM_Sans]">
              {dayKind === "past"
                ? "No tasks were scheduled for this day"
                : "No tasks yet — tap Manage Tasks to add one"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((t, i) => (
              <TaskPill key={t.id || i} task={t} color="#6366f1" />
            ))}
          </div>
        )}

        {/* Past lock notice */}
        {dayKind === "past" && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/70 border border-slate-100">
            <svg
              width="11"
              height="11"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p className="text-[10.5px] text-slate-400 font-[DM_Sans]">
              Past tasks are read-only and cannot be edited
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   TodayBanner — tasks only
───────────────────────────────────────────── */
function TodayBanner({ record, onOpenModal }) {
  const tasks = Array.isArray(record?.tasks)
    ? record.tasks.filter((t) => t.title)
    : [];
  const tk = todayKey();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-5 rounded-[18px] overflow-hidden border"
      style={{
        borderColor: "#c7d2fe",
        background: `linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)`,
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: "#6366f1" }}
          >
            {"📅"}
          </div>
          <div>
            <p className="text-[10.5px] font-bold tracking-widest uppercase text-indigo-500 font-[DM_Sans]">
              Today's Schedule
            </p>
            {tasks.length > 0 ? (
              <p className="text-[13px] font-bold text-slate-800 font-[DM_Sans] leading-tight">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} planned
              </p>
            ) : (
              <p className="text-[13px] text-slate-400 font-[DM_Sans]">
                Nothing planned yet
              </p>
            )}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onOpenModal(record, tk)}
          className="flex items-center gap-1.5 px-3 h-[34px] rounded-[10px] text-[11.5px] font-bold transition font-[DM_Sans] flex-shrink-0"
          style={{
            background: "#eef2ff",
            color: "#6366f1",
            border: `1px solid #c7d2fe`,
          }}
        >
          <svg
            width="11"
            height="11"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Manage Tasks
        </motion.button>
      </div>

      {tasks.length > 0 && (
        <div
          className="mx-3.5 mb-3.5 rounded-[10px] px-3.5 py-2.5 flex flex-col gap-1.5"
          style={{
            background: `#6366f10c`,
            border: `1px solid #c7d2fe`,
          }}
        >
          {tasks.slice(0, 3).map((t, i) => (
            <div key={t.id || i} className="flex items-center gap-2">
              <span
                className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                style={{ background: "#6366f1" }}
              />
              <span className="text-[12px] text-slate-600 font-[DM_Sans] flex-1 truncate">
                {t.title}
              </span>
              {t.time && (
                <span
                  className="text-[10px] font-semibold font-[DM_Sans] flex-shrink-0"
                  style={{ color: "#6366f1" }}
                >
                  {fmtTime(t.time)}
                </span>
              )}
              {t.duration && (
                <span className="text-[10px] text-slate-400 font-[DM_Sans] flex-shrink-0">
                  {t.duration}m
                </span>
              )}
            </div>
          ))}
          {tasks.length > 3 && (
            <p className="text-[10.5px] text-slate-400 pl-3.5 font-[DM_Sans]">
              +{tasks.length - 3} more
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function ScheduleCalendarPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const now = new Date();

  const [current, setCurrent] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [scheduleMap, setScheduleMap] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalDate, setModalDate] = useState(null);
  const [modalRecord, setModalRecord] = useState(null);

  const isAtCurrentMonth =
    current.year === now.getFullYear() && current.month === now.getMonth();

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchMonth = useCallback(async (year, month0) => {
    setLoadingData(true);
    setSelectedDay(null);
    try {
      const res = await axios.get(`${API}/schedule/monthly`, {
        params: { year, month: month0 + 1 },
        withCredentials: true,
      });
      if (res.data.success) {
        setScheduleMap(res.data.data.schedules || {});
      }
    } catch {
      setScheduleMap({});
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(current.year, current.month);
  }, [current, fetchMonth]);

  /* ── Navigation ─────────────────────────────────────────────────── */
  const goBack = () =>
    setCurrent((p) =>
      p.month === 0
        ? { year: p.year - 1, month: 11 }
        : { ...p, month: p.month - 1 },
    );
  const goForward = () => {
    if (isAtCurrentMonth) return;
    setCurrent((p) =>
      p.month === 11
        ? { year: p.year + 1, month: 0 }
        : { ...p, month: p.month + 1 },
    );
  };

  /* ── Grid ───────────────────────────────────────────────────────── */
  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = new Date(current.year, current.month, 1).toLocaleString(
    "en-US",
    { month: "long" },
  );

  /* ── Records ────────────────────────────────────────────────────── */
  const todayRecord = isAtCurrentMonth
    ? (scheduleMap[todayKey()] ?? null)
    : null;
  const selectedRecord = selectedDay
    ? (scheduleMap[dateKey(current.year, current.month, selectedDay)] ?? null)
    : null;
  const selectedDayKind = selectedDay
    ? getDayKind(current.year, current.month, selectedDay)
    : null;

  /* ── Modal ──────────────────────────────────────────────────────── */
  const openModal = useCallback((record, dk) => {
    setModalDate(dk);
    setModalRecord(record ?? null);
  }, []);

  const closeModal = useCallback(() => {
    setModalDate(null);
    setModalRecord(null);
  }, []);

  const handleSaved = useCallback(() => {
    closeModal();
    fetchMonth(current.year, current.month);
  }, [closeModal, fetchMonth, current]);

  /* ── Summary counts ─────────────────────────────────────────────── */
  const counts = Object.values(scheduleMap).reduce((acc, s) => {
    if (s.workType) acc[s.workType] = (acc[s.workType] || 0) + 1;
    return acc;
  }, {});

  const cellSize = isMobile ? 40 : 46;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-[22px]"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={`font-bold text-slate-900 font-[Georgia] ${isMobile ? "text-[20px]" : "text-[22px]"}`}
            >
              My Schedule
            </h1>
          </div>
        </div>
      </motion.div>

      {/* ── Today Banner ─────────────────────────────────────────── */}
      {isAtCurrentMonth && (
        <TodayBanner record={todayRecord} onOpenModal={openModal} />
      )}

      {/* ── Main Card ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-[20px] border border-slate-100 shadow-sm"
      >
        {/* Dark header */}
        <div
          className={`flex items-center justify-between rounded-t-[20px] bg-gradient-to-br from-slate-900 to-slate-800
            ${isMobile ? "px-4 py-[18px]" : "px-7 py-5"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-indigo-500/20 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#818cf8"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <p
                className={`text-white font-bold leading-none font-serif ${isMobile ? "text-[17px]" : "text-[19px]"}`}
              >
                {monthName}
              </p>
              <p className="text-[12px] text-slate-500 mt-1">{current.year}</p>
            </div>
          </div>

          <div className="flex gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goBack}
              className="w-[38px] h-[38px] rounded-[11px] bg-white/10 text-slate-400 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>

            {!isAtCurrentMonth && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() =>
                  setCurrent({ year: now.getFullYear(), month: now.getMonth() })
                }
                className="px-2.5 h-[38px] rounded-[11px] bg-white/10 text-slate-400 hover:bg-white/20 text-[10px] font-bold tracking-wider uppercase transition cursor-pointer font-[DM_Sans]"
              >
                Today
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goForward}
              disabled={isAtCurrentMonth}
              className={`w-[38px] h-[38px] rounded-[11px] flex items-center justify-center transition
                ${
                  isAtCurrentMonth
                    ? "bg-transparent text-slate-700 cursor-not-allowed"
                    : "bg-white/10 text-slate-400 hover:bg-white/20 cursor-pointer"
                }`}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Summary pills */}
        {!loadingData && Object.keys(counts).length > 0 && (
          <div
            className={`border-b border-slate-100 ${isMobile ? "px-3.5 pt-3 pb-2.5" : "px-7 pt-3.5 pb-2.5"}`}
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 font-[DM_Sans]">
                {Object.values(counts).reduce((a, b) => a + b, 0)} scheduled
                this month
              </span>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <div className={isMobile ? "px-3 pt-4 pb-2" : "px-7 pt-5 pb-2"}>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
              <span
                key={i}
                className={`text-center text-[11px] font-semibold pb-1.5 tracking-[0.05em] font-[DM_Sans]
                  ${i === 0 || i === 6 ? "text-slate-300" : "text-slate-400"}`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Cells */}
          <div
            className={`grid grid-cols-7 ${isMobile ? "gap-y-1 gap-x-0.5" : "gap-y-1.5 gap-x-1"}`}
          >
            {loadingData
              ? Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="flex justify-center">
                    <div
                      className="rounded-full animate-pulse bg-slate-100"
                      style={{ width: cellSize, height: cellSize }}
                    />
                  </div>
                ))
              : cells.map((day, i) => {
                  if (!day) return <div key={i} />;

                  const dk = dateKey(current.year, current.month, day);
                  const rec = scheduleMap[dk];
                  const meta = rec ? WORK_TYPE_META.OFFICE : null;
                  const kind = getDayKind(current.year, current.month, day);
                  const isToday = kind === "present";
                  const isPast = kind === "past";
                  const isSelected = selectedDay === day;
                  const isWeekend = i % 7 === 0 || i % 7 === 6;
                  const hasTasks =
                    Array.isArray(rec?.tasks) && rec.tasks.some((t) => t.title);

                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-[3px]"
                    >
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        /* Every day — past, present, future — opens the detail panel */
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className="relative flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          background: isToday
                            ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                            : isSelected
                              ? meta
                                ? `${meta.color}22`
                                : "#eef2ff"
                              : meta
                                ? `${meta.color}14`
                                : "transparent",
                          border: isToday
                            ? "2.5px solid #6366f1"
                            : isSelected
                              ? `2.5px solid ${meta ? meta.color : "#6366f1"}`
                              : "2.5px solid transparent",
                          fontSize: isMobile ? 13 : 13.5,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: isToday ? 800 : isWeekend ? 400 : 600,
                          /* Past days without tasks are visually dimmed */
                          color: isToday
                            ? "#fff"
                            : isPast
                              ? "#94a3b8"
                              : isWeekend
                                ? "#94a3b8"
                                : "#334155",
                          opacity: isPast && !rec ? 0.7 : 1,
                        }}
                      >
                        {day}
                      </motion.button>

                      {/* Dot indicators */}
                      {hasTasks && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-[2px]"
                        >
                          <div
                            className="w-[5px] h-[5px] rounded-full"
                            style={{
                              background: isPast ? "#cbd5e1" : "#6366f1",
                            }}
                          />
                          {hasTasks && (
                            <div className="w-[3px] h-[3px] rounded-full bg-slate-300" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Detail Panel — shown for ALL days; dayKind controls what's editable */}
        <AnimatePresence>
          {selectedDay && (
            <DayDetailPanel
              day={selectedDay}
              month0={current.month}
              year={current.year}
              record={selectedRecord}
              dayKind={selectedDayKind}
              onClose={() => setSelectedDay(null)}
              onOpenModal={openModal}
            />
          )}
        </AnimatePresence>

        {/* Footer legend */}
        <div
          className={`border-t border-slate-100 bg-slate-50 rounded-b-[20px] flex flex-wrap items-center
            ${isMobile ? "px-3.5 pt-2.5 pb-3.5 gap-y-[7px] gap-x-3.5" : "px-7 pt-3 pb-4 gap-y-1.5 gap-x-5"}`}
        >
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-[DM_Sans]">
            <span className="w-[6px] h-[6px] rounded-full inline-block bg-slate-300" />
            Has tasks
          </span>
          {!isMobile && (
            <span className="ml-auto text-[10px] text-slate-300 font-[DM_Sans]">
              Click any day to view · Past days are read-only
            </span>
          )}
        </div>
      </motion.div>

      {/* Modal — only mounts for present / future dates */}
      <AnimatePresence>
        {modalDate && (
          <ScheduleModal
            initialDate={modalDate}
            initialData={modalRecord}
            onClose={closeModal}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}
