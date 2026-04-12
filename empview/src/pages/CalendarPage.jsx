import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../App";

import Icon from "../components/ui/icons/Icon";
import { Icons } from "../components/ui/icons/iconPaths";
import { STATUS } from "../constants/attendanceStatus";

import { useIsMobile } from "../hooks/useIsMobile";

import DesktopDetailPanel from "../components/DesktopDetailPanel";
import MobileDetailPanel from "../components/MobileDetailPanel";

import ProgressRing from "../components/ProgressRing";

import { PORT } from "../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

/* ── Summary pill config ──────────────────────────────────────────────────────
   Keys match the lowercase summary object from the new API:
   { present, absent, late, onLeave, overtime, holidays, workingDaysTotal }
────────────────────────────────────────────────────────────────────────────── */
const SUMMARY_ITEMS = [
  { key: "present", statusKey: "PRESENT", ...STATUS.PRESENT },
  { key: "absent", statusKey: "ABSENT", ...STATUS.ABSENT },
  { key: "late", statusKey: "LATE", ...STATUS.LATE },
  { key: "onLeave", statusKey: "ON_LEAVE", ...STATUS.ON_LEAVE },
  {
    key: "overtime",
    statusKey: null,
    color: "#06b6d4",
    bg: "#ecfeff",
    border: "#a5f3fc",
    dot: "#06b6d4",
    label: "Overtime",
  },
];

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const now = new Date();

  const [current, setCurrent] = useState({
    year: now.getFullYear(),
    month: now.getMonth(), // 0-based internally
  });

  /* attendanceMap: "YYYY-MM-DD" → day object from API */
  const [attendanceMap, setAttendanceMap] = useState({});
  const [summary, setSummary] = useState({});
  const [shift, setShift] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  /* ── Joining-date guards ─────────────────────────────────────── */
  const joinDate = user?.dateOfJoining
    ? new Date(user.dateOfJoining)
    : new Date(now.getFullYear(), 0, 1);

  const isAtJoinMonth =
    current.year === joinDate.getFullYear() &&
    current.month === joinDate.getMonth();

  const isAtCurrentMonth =
    current.year === now.getFullYear() && current.month === now.getMonth();

  /* ── Fetch ───────────────────────────────────────────────────── */
  const fetchMonth = useCallback(async (year, month0) => {
    setLoadingData(true);
    setSelectedDay(null);
    try {
      const res = await axios.get(`${API}/attendance-monthly`, {
        params: { year, month: month0 + 1 }, // API expects 1-based month
        withCredentials: true,
      });

      if (res.data.success) {
        const { days = [], summary: s = {}, shift: sh = null } = res.data.data;

        /* Convert days array → map keyed by date string "YYYY-MM-DD" */
        const map = {};
        days.forEach((d) => {
          map[d.date] = d;
        });

        setAttendanceMap(map);
        setSummary(s);
        setShift(sh);
      }
    } catch {
      setAttendanceMap({});
      setSummary({});
      setShift(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // console.log(attendanceMap);
  useEffect(() => {
    fetchMonth(current.year, current.month);
  }, [current, fetchMonth]);

  // console.log("Attendance map:", attendanceMap);
  /* ── Navigation ─────────────────────────────────────────────── */
  const goBack = () => {
    if (isAtJoinMonth) return;
    setCurrent((p) =>
      p.month === 0
        ? { year: p.year - 1, month: 11 }
        : { ...p, month: p.month - 1 },
    );
  };
  const goForward = () => {
    if (isAtCurrentMonth) return;
    setCurrent((p) =>
      p.month === 11
        ? { year: p.year + 1, month: 0 }
        : { ...p, month: p.month + 1 },
    );
  };

  /* ── Calendar grid ───────────────────────────────────────────── */
  const firstDay = new Date(current.year, current.month, 1).getDay();
  const offset = firstDay;
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = new Date(current.year, current.month, 1).toLocaleString(
    "en-US",
    { month: "long" },
  );

  /* ── Attendance rate ─────────────────────────────────────────── */
  const workingDaysTotal = summary.workingDaysTotal || 0;
  const presentCount = summary.present || 0;
  const attendanceRate =
    workingDaysTotal > 0
      ? Math.round((presentCount / workingDaysTotal) * 100)
      : null;
  const rateColor =
    attendanceRate === null
      ? "#94a3b8"
      : attendanceRate >= 80
        ? "#10b981"
        : attendanceRate >= 60
          ? "#f59e0b"
          : "#ef4444";

  /* ── Selected day ────────────────────────────────────────────── */
  const dateKey = (day) => {
    const m = String(current.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${current.year}-${m}-${d}`;
  };
  const selectedRecord = selectedDay
    ? (attendanceMap[dateKey(selectedDay)] ?? null)
    : null;

  /* ── Status helper ───────────────────────────────────────────── */
  const getStatusStyle = (dayObj) => {
    if (!dayObj) return null;
    const key = dayObj.status;
    return STATUS[key] ?? null;
  };

  return (
    <>
      <style>{`@keyframes calspin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-[22px]"
      >
        <div className="flex items-center justify-between">
          <h1
            className={`font-bold text-slate-900 font-[Georgia] ${
              isMobile ? "text-[20px]" : "text-[22px]"
            }`}
          >
            My Calendar
          </h1>

          {/* Attendance rate ring */}
          {attendanceRate !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-[12px] bg-white border border-slate-100 rounded-[16px] px-[16px] py-[10px] shadow-sm"
            >
              <div className="relative w-[52px] h-[52px]">
                <ProgressRing
                  pct={attendanceRate}
                  color={rateColor}
                  size={52}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: rateColor }}
                  >
                    {attendanceRate}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-900 mb-[1px] font-[DM_Sans]">
                  {monthName}
                </p>
                <p className="text-[10.5px] text-slate-400">Attendance rate</p>
                {shift && (
                  <p className="text-[9.5px] text-indigo-400 font-semibold mt-[1px]">
                    shift - {shift.startTime}–{shift.endTime}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Main Card ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-[20px] border border-slate-100 shadow-sm"
      >
        {/* Dark header */}
        <div
          className={`
            flex items-center justify-between rounded-t-[20px]
            bg-gradient-to-br from-slate-900 to-slate-800
            ${isMobile ? "px-[16px] py-[18px]" : "px-[28px] py-[20px]"}
          `}
        >
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Icon d={Icons.calendar} size={18} />
            </div>
            <div>
              <p
                className={`text-white font-bold leading-none font-serif ${isMobile ? "text-[17px]" : "text-[19px]"}`}
              >
                {monthName}
              </p>
              <p className="text-[12px] text-slate-500 mt-[4px]">
                {current.year}
              </p>
            </div>
          </div>

          <div className="flex gap-[6px]">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goBack}
              disabled={isAtJoinMonth}
              className={`
                w-[38px] h-[38px] rounded-[11px] flex items-center justify-center transition
                ${
                  isAtJoinMonth
                    ? "bg-transparent text-slate-700 cursor-not-allowed"
                    : "bg-white/10 text-slate-400 hover:bg-white/20 cursor-pointer"
                }
              `}
            >
              <Icon d={Icons.chevLeft} size={16} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goForward}
              disabled={isAtCurrentMonth}
              className={`
                w-[38px] h-[38px] rounded-[11px] flex items-center justify-center transition
                ${
                  isAtCurrentMonth
                    ? "bg-transparent text-slate-700 cursor-not-allowed"
                    : "bg-white/10 text-slate-400 hover:bg-white/20 cursor-pointer"
                }
              `}
            >
              <Icon d={Icons.chevRight} size={16} />
            </motion.button>
          </div>
        </div>

        {/* Summary pills */}
        <div
          className={`
            border-b border-slate-100
            ${isMobile ? "px-[14px] pt-[14px] pb-[10px]" : "px-[28px] pt-[16px] pb-[12px]"}
          `}
        >
          {loadingData ? (
            <div className="flex justify-center py-[10px]">
              <div className="w-[22px] h-[22px] rounded-full border-[2.5px] border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div
              className={`grid ${isMobile ? "grid-cols-3 gap-2" : "grid-cols-5 gap-[10px]"}`}
            >
              {SUMMARY_ITEMS.map((s) => (
                <div
                  key={s.key}
                  className={`text-center rounded-xl ${isMobile ? "px-[4px] py-[8px]" : "px-[6px] py-[10px]"}`}
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <p
                    className={`font-bold leading-none font-serif ${isMobile ? "text-[18px]" : "text-[20px]"}`}
                    style={{ color: s.color }}
                  >
                    {summary[s.key] ?? 0}
                  </p>
                  <p
                    className={`mt-[4px] font-semibold opacity-85 font-[DM_Sans] ${isMobile ? "text-[9px]" : "text-[10px]"}`}
                    style={{ color: s.color }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <div style={{ padding: isMobile ? "16px 12px 8px" : "20px 28px 8px" }}>
          {/* Day-of-week headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              marginBottom: 8,
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
              <span
                key={i}
                className={`text-center text-[11px] font-semibold pb-[6px] tracking-[0.05em] font-[DM_Sans] ${i == 0 || i == 6 ? "text-slate-300" : "text-slate-400"}`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day cells */}
          <div
            className={`grid grid-cols-7 ${isMobile ? "gap-y-[4px] gap-x-[2px]" : "gap-y-[6px] gap-x-[4px]"}`}
          >
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;

              const dk = dateKey(day);
              const dayObj = attendanceMap[dk]; // full day record from API
              const s = getStatusStyle(dayObj);
              const isToday =
                day === now.getDate() &&
                current.month === now.getMonth() &&
                current.year === now.getFullYear();
              const isFuture = new Date(current.year, current.month, day) > now;
              const isSelected = selectedDay === day;
              const isWeekend = i % 7 >= 5;
              const isHoliday = dayObj?.isHoliday ?? false;
              const cellSize = isMobile ? 40 : 46;

              return (
                <div key={i} className="flex flex-col items-center gap-[3px]">
                  <motion.button
                    whileHover={!isFuture ? { scale: 1.12 } : {}}
                    whileTap={!isFuture ? { scale: 0.92 } : {}}
                    onClick={() => {
                      if (!isFuture) setSelectedDay(isSelected ? null : day);
                    }}
                    title={isHoliday ? dayObj.holidayName : undefined}
                    className={`
                      flex items-center justify-center rounded-full transition-all duration-150
                      ${isFuture ? "cursor-default" : "cursor-pointer"}
                      ${isToday ? "text-white font-bold shadow-[0_4px_12px_rgba(99,102,241,0.35)]" : ""}
                      ${isFuture ? "text-gray-300" : isWeekend ? "text-slate-400" : "text-slate-700"}
                    `}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: isSelected
                        ? `2.5px solid ${s?.color || "#6366f1"}`
                        : isToday
                          ? "2.5px solid #6366f1"
                          : isHoliday
                            ? "2.5px solid #10b98140"
                            : "2.5px solid transparent",
                      background: isToday
                        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : isHoliday && !isFuture
                          ? "#10b98112"
                          : s && !isFuture
                            ? `${s.color}16`
                            : "transparent",
                      fontSize: isMobile ? 13 : 13.5,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {day}
                  </motion.button>

                  {/* Status dot — holiday gets a green star, others use status dot */}
                  {!isToday &&
                    !isFuture &&
                    (isHoliday ? (
                      <span style={{ fontSize: 8, lineHeight: 1 }}>🎉</span>
                    ) : s ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: s.dot }}
                      />
                    ) : null)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop detail panel */}
        {!isMobile && (
          <AnimatePresence>
            {selectedDay && (
              <DesktopDetailPanel
                day={selectedDay}
                month0={current.month}
                year={current.year}
                record={selectedRecord}
                onClose={() => setSelectedDay(null)}
              />
            )}
          </AnimatePresence>
        )}

        {/* Legend footer */}
        <div
          className={`
            border-t border-slate-100 bg-slate-50 rounded-b-[20px] flex flex-wrap items-center
            ${isMobile ? "px-[14px] pt-[10px] pb-[14px] gap-[7px_14px]" : "px-[28px] pt-[12px] pb-[16px] gap-[6px_20px]"}
          `}
        >
          {SUMMARY_ITEMS.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-[6px] text-[11px] text-slate-500 font-[DM_Sans]"
            >
              <span
                className="w-[8px] h-[8px] rounded-full inline-block flex-shrink-0"
                style={{ background: s.dot }}
              />
              {s.label}
            </span>
          ))}
          {/* Holiday legend entry */}
          <span className="flex items-center gap-[6px] text-[11px] text-slate-500 font-[DM_Sans]">
            <span className="text-[9px]">🎉</span>
            Holiday
          </span>

          {!isMobile && (
            <span className="ml-auto text-[10px] text-slate-300 font-[DM_Sans]">
              Click a day to see details
            </span>
          )}
        </div>
      </motion.div>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <AnimatePresence>
          {selectedDay && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDay(null)}
                className="fixed inset-0 z-[190] bg-slate-900/45 backdrop-blur-[3px]"
              />
              <MobileDetailPanel
                day={selectedDay}
                month0={current.month}
                year={current.year}
                record={selectedRecord}
                onClose={() => setSelectedDay(null)}
              />
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
