import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

const API = "http://localhost:5000/api/employee";

const STATUS_COLORS = {
  PRESENT: "bg-green-500",
  LATE: "bg-green-500", // treat late as present
  HALF_DAY: "bg-yellow-500",
  ON_LEAVE: "bg-yellow-500",
  ABSENT: "bg-red-500",
  MISSED_PUNCH: "bg-red-500", // treat missed punch as absent
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);

  const isCurrentMonth =
    currentMonth === now.getMonth() && currentYear === now.getFullYear();

  // Fetch attendance whenever month/year changes
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API}/attendance-monthly?month=${currentMonth + 1}&year=${currentYear}`,
          {
            withCredentials: true,
          },
        );
        setAttendanceMap(res.data.data.attendance || {});
      } catch (err) {
        console.error("Failed to fetch attendance", err);
        setAttendanceMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [currentMonth, currentYear]);

  const goToPrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNext = () => {
    if (isCurrentMonth) return; // block going beyond current month
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1);
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Convert JS day (Sun=0) to Mon-based offset (Mon=0)
  const firstDayOffset = (firstDay.getDay() + 6) % 7;

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDayOffset + 1;
    if (dayNum > 0 && dayNum <= totalDays) return dayNum;
    return null;
  });

  // Remove trailing empty rows
  const trimmed = calendarDays.slice(
    0,
    Math.ceil((firstDayOffset + totalDays) / 7) * 7,
  );

  const monthLabel = new Date(currentYear, currentMonth).toLocaleString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const getDotColor = (day) => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = attendanceMap[dateKey];
    if (!record) return null;
    return STATUS_COLORS[record.status] || null;
  };

  const isToday = (day) => day === now.getDate() && isCurrentMonth;

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-8 transition-colors duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-serif font-bold dark:text-white">
          {monthLabel}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPrev}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-black dark:hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            disabled={isCurrentMonth}
            className={`p-2 rounded-full transition-colors ${
              isCurrentMonth
                ? "text-gray-200 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-2 sm:gap-y-3 gap-x-1 sm:gap-x-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-sans font-medium text-center uppercase tracking-wider"
              >
                {day}
              </div>
            ))}

            {trimmed.map((day, index) => {
              const dotColor = day ? getDotColor(day) : null;
              const today = day && isToday(day);

              return (
                <div
                  key={index}
                  className="aspect-square flex items-center justify-center relative"
                >
                  {day && (
                    <button
                      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-sans rounded-full transition-colors
                        ${
                          today
                            ? "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                      {day}
                      {dotColor && (
                        <span
                          className={`absolute bottom-0.5 sm:bottom-1 w-1 h-1 rounded-full ${dotColor} ${today ? "opacity-60" : ""}`}
                        />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100 dark:border-gray-700 justify-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-400 font-sans">
                Present / Late
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-gray-400 font-sans">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-xs text-gray-400 font-sans">
                Leave / Half Day
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
