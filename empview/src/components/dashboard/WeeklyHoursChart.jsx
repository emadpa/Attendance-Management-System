import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

import NavArrow from "../NavArrow";
import axios from "axios";
import { PORT } from "../../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

function formatWeekRange(weekStart, weekEnd) {
  if (!weekStart || !weekEnd) return "";
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(weekEnd + "T00:00:00");
  const opts = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

/* ── Skeleton bars shown while fetching ── */
function ChartSkeleton() {
  const heights = [55, 75, 40, 80, 60, 45, 70];
  return (
    <div className="flex items-end gap-2.5" style={{ height: 240 }}>
      {heights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div style={{ height: 20 }} />
          <div
            className="w-full rounded-xl overflow-hidden"
            style={{
              height: 180,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                position: "relative",
                bottom: 0,
                marginTop: `${100 - h}%`,
                height: `${h}%`,
                borderRadius: "10px 10px 0 0",
                background:
                  "linear-gradient(90deg,#f1f5f9 0%,#e8edf4 50%,#f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </div>
          <div
            style={{
              height: 16,
              width: "60%",
              borderRadius: 4,
              background: "#f1f5f9",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function WeeklyHoursChart() {
  const [weeklyData, setWeeklyData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true); // only chart loading, not full page
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchWeeklyHours();
  }, [weekOffset]);

  const fetchWeeklyHours = async () => {
    try {
      setChartLoading(true);
      setError(null);
      const response = await axios.get(
        `${API}/attendance/weekly-hours?weekOffset=${weekOffset}`,
        { withCredentials: true },
      );
      if (response.data.success) {
        setWeeklyData(response.data.data);
      } else {
        throw new Error(response.data.message || "Failed to load data");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching weekly hours:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // On first load with no data yet, show a minimal shell

  const days = weeklyData?.days ?? [];
  const maxH = days.length
    ? Math.max(...days.map((d) => d.hours), weeklyData?.targetHours ?? 0, 10)
    : 10;
  const targetHours = weeklyData?.targetHours ?? 8;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
        minHeight: 440,
      }}
    >
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Header — never unmounts ── */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div
            className="rounded-xl p-2.5 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            }}
          >
            <Clock size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              Weekly Hours
            </h3>
            {/* Week range updates once data arrives; shows placeholder while loading */}
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginTop: 2,
                minHeight: 16,
              }}
            >
              {weeklyData ? (
                formatWeekRange(weeklyData.weekStart, weeklyData.weekEnd)
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 140,
                    height: 12,
                    borderRadius: 4,
                    background: "#f1f5f9",
                  }}
                />
              )}
            </p>
          </div>
        </div>

        {/* Nav — always visible, disabled while loading */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <NavArrow
            direction="left"
            disabled={chartLoading || !!weeklyData?.isJoiningWeek}
            onClick={() => setWeekOffset((o) => o - 1)}
          />
          {weekOffset !== 0 && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setWeekOffset(0)}
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#6366f1",
                background: "#eef2ff",
                border: "none",
                borderRadius: 99,
                padding: "4px 11px",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              This Week
            </motion.button>
          )}
          <NavArrow
            direction="right"
            disabled={chartLoading || !!weeklyData?.isCurrentWeek}
            onClick={() => setWeekOffset((o) => o + 1)}
          />
        </div>
      </div>

      {/* ── Chart area — swaps between skeleton and real bars ── */}
      <AnimatePresence mode="wait">
        {chartLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChartSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ color: "#dc2626", fontSize: 13 }}>⚠ {error}</p>
          </motion.div>
        ) : (
          <motion.div
            key={`chart-${weekOffset}`} // re-animates bars on week change
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-end gap-2.5" style={{ height: 240 }}>
              {days.map((d, i) => {
                const pct = Math.min((d.hours / maxH) * 100, 100);
                const tPct = (targetHours / maxH) * 100;
                const meetsTarget = d.hours >= targetHours && d.hours > 0;
                const isNA = d.isBeforeJoining || d.isFuture;

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    {/* Hours label */}
                    <div
                      style={{
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {d.hours > 0 && (
                        <motion.span
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 + 0.3 }}
                          style={{
                            fontSize: 11,
                            color: meetsTarget
                              ? "#16a34a"
                              : d.isToday
                                ? "#6366f1"
                                : "#64748b",
                            fontWeight: meetsTarget || d.isToday ? 700 : 600,
                          }}
                        >
                          {d.hours}h
                        </motion.span>
                      )}
                    </div>

                    {/* Bar container */}
                    <div
                      className="w-full relative rounded-xl overflow-hidden"
                      style={{
                        height: 180,
                        background: isNA ? "#fafafa" : "#f8fafc",
                        border: d.isToday
                          ? "2px solid #6366f1"
                          : "1px solid #e2e8f0",
                      }}
                    >
                      {/* Target line */}
                      {!isNA && (
                        <div
                          className="absolute w-full border-t-2 border-dashed z-10"
                          style={{
                            borderColor: "#f59e0b",
                            top: `${100 - tPct}%`,
                            opacity: 0.7,
                          }}
                        />
                      )}

                      {/* Bar */}
                      {!isNA && d.hours > 0 && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{
                            delay: i * 0.08,
                            duration: 0.6,
                            ease: [0.34, 1.56, 0.64, 1],
                          }}
                          className="absolute bottom-0 w-full rounded-t-xl"
                          style={{
                            background: d.isToday
                              ? "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)"
                              : meetsTarget
                                ? "linear-gradient(180deg, #6ee7b7 0%, #10b981 100%)"
                                : "linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)",
                            boxShadow: d.isToday
                              ? "0 -4px 16px rgba(99,102,241,0.4)"
                              : meetsTarget
                                ? "0 -2px 10px rgba(16,185,129,0.2)"
                                : "0 -2px 8px rgba(96,165,250,0.2)",
                          }}
                        >
                          <div
                            className="absolute inset-0 rounded-t-xl"
                            style={{
                              background:
                                "linear-gradient(180deg,rgba(255,255,255,0.3) 0%,transparent 50%)",
                            }}
                          />
                        </motion.div>
                      )}

                      {/* N/A */}
                      {isNA && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            style={{
                              fontSize: 10,
                              color: "#cbd5e1",
                              fontWeight: 500,
                            }}
                          >
                            —
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Day label */}
                    <span
                      style={{
                        fontSize: 11,
                        color: d.isToday ? "#6366f1" : "#64748b",
                        fontWeight: d.isToday ? 700 : 500,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend — never unmounts ── */}
      <div
        className="flex items-center justify-center gap-4 mt-5 pt-4"
        style={{ borderTop: "1px solid #f1f5f9" }}
      >
        {[
          { swatch: "linear-gradient(135deg,#818cf8,#6366f1)", label: "Today" },
          {
            swatch: "linear-gradient(135deg,#6ee7b7,#10b981)",
            label: "Meets Target",
          },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: l.swatch }} />
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
              {l.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 border-t-2 border-dashed inline-block"
            style={{ borderColor: "#f59e0b" }}
          />
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            {targetHours}h Target
          </span>
        </div>
      </div>
    </div>
  );
}
