import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../App";
import axios from "axios";
import { PORT } from "../../constants/port";

import NavArrow from "../NavArrow";

const API = `http://localhost:${PORT}/api/employee`;

function timeStrToDecimal(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

function timeStrToLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function shiftTimeToDecimal(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}

function formatWeekRange(weekStart, weekEnd) {
  if (!weekStart || !weekEnd) return "";
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(weekEnd + "T00:00:00");
  const opts = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function minsToLabel(mins) {
  if (!mins || mins === 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ─────────────────────────────────────────────
   Layout constants — single source of truth.
   Bar math is done purely within [MIN..MAX].
   CHART_H = pixel height of bar-drawing zone.
   LABEL_H = pixel height of day label zone below bars.
───────────────────────────────────────────── */
const CHART_H = 200;
const LABEL_H = 58;
const MIN = 6;
const MAX = 20;
const RANGE = MAX - MIN;

/**
 * Convert an hour value to a % from the TOP of the bar canvas.
 * hour=MAX  → 0%  (top edge)
 * hour=MIN  → 100% (bottom edge)
 */
function hourToPct(h) {
  return ((MAX - h) / RANGE) * 100;
}

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */
const STATUS_META = {
  PRESENT: {
    label: "Present",
    dot: "#6366f1",
    bg: "#eef2ff",
    color: "#4338ca",
  },
  LATE: { label: "Late", dot: "#f97316", bg: "#fff7ed", color: "#c2410c" },
  HALF_DAY: {
    label: "Half Day",
    dot: "#8b5cf6",
    bg: "#f5f3ff",
    color: "#6d28d9",
  },
  ABSENT: { label: "Absent", dot: "#ef4444", bg: "#fef2f2", color: "#b91c1c" },
  ON_LEAVE: {
    label: "On Leave",
    dot: "#06b6d4",
    bg: "#ecfeff",
    color: "#0e7490",
  },
  HOLIDAY: {
    label: "Holiday",
    dot: "#10b981",
    bg: "#f0fdf4",
    color: "#065f46",
  },
  WEEKEND: {
    label: "Weekend",
    dot: "#94a3b8",
    bg: "#f8fafc",
    color: "#475569",
  },
  N_A: { label: "—", dot: "#e2e8f0", bg: "#f8fafc", color: "#cbd5e1" },
};

function getStatusMeta(status) {
  const key = (status || "N_A").replace(/[-\s]/g, "_").toUpperCase();
  return STATUS_META[key] || STATUS_META.N_A;
}

/* ─────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────── */
function DayTooltip({ day, shift }) {
  const meta = getStatusMeta(day.status);
  const lateLabel = minsToLabel(day.lateDuration);
  const otLabel = minsToLabel(day.overtimeDuration);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.93 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        minWidth: 162,
        background: "#0f172a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "13px 15px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.40)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 6,
          background: "#0f172a",
          clipPath: "polygon(0 0,100% 0,50% 100%)",
        }}
      />

      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#f1f5f9",
          marginBottom: 7,
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {day.dayLabel}, {day.dayNum} {day.monthLabel}
      </p>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 9,
          padding: "3px 8px",
          borderRadius: 99,
          fontSize: 9.5,
          fontWeight: 700,
          background: meta.bg,
          color: meta.color,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: meta.dot,
          }}
        />
        {meta.label}
      </span>

      {day.isHoliday && day.holidayName && (
        <p
          style={{
            fontSize: 10,
            color: "#6ee7b7",
            marginBottom: 7,
            fontWeight: 600,
          }}
        >
          🎉 {day.holidayName}
        </p>
      )}
      {day.leaveInfo && (
        <p
          style={{
            fontSize: 10,
            color: "#67e8f9",
            marginBottom: 7,
            fontWeight: 600,
          }}
        >
          📋 {day.leaveInfo.name}
          {day.leaveInfo.isPaid ? " (Paid)" : " (Unpaid)"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <TRow
          icon="▶"
          label="Clock In"
          value={timeStrToLabel(day.punchIn)}
          color="#818cf8"
        />
        <TRow
          icon="■"
          label="Clock Out"
          value={timeStrToLabel(day.punchOut)}
          color="#a5b4fc"
        />
        {shift && (
          <>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                margin: "3px 0",
              }}
            />
            <TRow
              icon="◷"
              label="Shift"
              value={`${shift.startTime}–${shift.endTime}`}
              color="#475569"
            />
          </>
        )}
        {lateLabel && (
          <TRow icon="⚠" label="Late by" value={lateLabel} color="#fbbf24" />
        )}
        {otLabel && (
          <TRow icon="★" label="Overtime" value={otLabel} color="#34d399" />
        )}
      </div>
    </motion.div>
  );
}

function TRow({ icon, label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 9.5,
          color: "#475569",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#e2e8f0" }}>
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Status Chip
───────────────────────────────────────────── */
function StatusChip({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        borderRadius: 6,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {meta.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Day Column
   The column is (CHART_H + LABEL_H) px tall.
   Bar visuals live in the top CHART_H px.
   Day label + chip live in the bottom LABEL_H px.
   All % positions are relative to CHART_H only.
───────────────────────────────────────────── */
function DayBar({ day, shift, index }) {
  const [hovered, setHovered] = useState(false);

  const shiftStart = shiftTimeToDecimal(shift?.startTime);
  const shiftEnd = shiftTimeToDecimal(shift?.endTime);

  const cin = timeStrToDecimal(day.punchIn);

  const cout = timeStrToDecimal(day.punchOut);

  const hasData = cin !== null && cout !== null;

  const isSpecial =
    day.isHoliday ||
    day.status === "WEEKEND" ||
    day.isBeforeJoining ||
    day.isFuture;
  const isOnLeave = day.status === "ON_LEAVE";
  const isAbsent = day.status === "ABSENT" && !isSpecial;
  const isLate = hasData && shiftStart != null && cin > shiftStart + 5 / 60;
  const isOvertime = hasData && shiftEnd != null && cout > shiftEnd + 5 / 60;

  /* % from top within the CHART_H canvas */
  const barTopPct = hasData ? hourToPct(cout) : 0;

  const barHeightPct = hasData ? ((cout - cin) / RANGE) * 100 : 0;

  const shiftEndPct = shiftEnd != null ? hourToPct(shiftEnd) : null;

  const isToday = (() => {
    const t = new Date();
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    return day.date === key;
  })();

  const canHover = !day.isBeforeJoining && !day.isFuture;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        height: CHART_H + LABEL_H,
      }}
      onMouseEnter={() => canHover && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── BAR CANVAS (top CHART_H px) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: CHART_H,
        }}
      >
        {isSpecial ? (
          /* special visuals */
          !day.isBeforeJoining &&
          !day.isFuture && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {day.isHoliday ? (
                <div
                  style={{
                    width: "58%",
                    height: "100%",
                    borderRadius: 10,
                    background:
                      "linear-gradient(180deg,rgba(16,185,129,0.18),rgba(16,185,129,0.06))",
                    border: "1.5px solid rgba(16,185,129,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 14 }}>🎉</span>
                </div>
              ) : (
                <div
                  style={{
                    width: "58%",
                    height: "100%",
                    borderRadius: 10,
                    background:
                      "repeating-linear-gradient(45deg,#f8fafc 0,#f8fafc 3px,#f1f5f9 3px,#f1f5f9 9px)",
                    border: "1.5px solid #e2e8f0",
                  }}
                />
              )}
            </div>
          )
        ) : isOnLeave ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "58%",
                height: "100%",
                borderRadius: 10,
                background:
                  "linear-gradient(180deg,rgba(6,182,212,0.18),rgba(6,182,212,0.06))",
                border: "1.5px solid rgba(6,182,212,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 13 }}>📋</span>
            </div>
          </div>
        ) : isAbsent ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "58%",
                height: "100%",
                borderRadius: 10,
                background:
                  "repeating-linear-gradient(135deg,#fef2f2 0,#fef2f2 2px,transparent 2px,transparent 8px)",
                border: "1.5px dashed #fca5a5",
              }}
            />
          </div>
        ) : hasData ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "relative", width: "58%", height: "100%" }}>
              {/* Normal / late segment */}
              <motion.div
                key={`bar-${day.date}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.055,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${barTopPct}%`,
                  height:
                    isOvertime && shiftEndPct != null
                      ? `${shiftEndPct - barTopPct}%`
                      : `${barHeightPct}%`,
                  transformOrigin: "bottom",
                  borderRadius: isOvertime ? "8px 8px 0 0" : 8,
                  background: isLate
                    ? "linear-gradient(180deg,#fb923c,#f97316)"
                    : "linear-gradient(180deg,#6366f1,#4f46e5)",
                  boxShadow: isLate
                    ? "0 4px 14px rgba(249,115,22,0.35)"
                    : "0 4px 14px rgba(99,102,241,0.35)",
                }}
              />

              {/* Overtime segment */}
              {isOvertime && shiftEndPct != null && (
                <motion.div
                  key={`ot-${day.date}`}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.055 + 0.18,
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${shiftEndPct}%`,
                    height: `${barTopPct + barHeightPct - shiftEndPct}%`,
                    transformOrigin: "top",
                    borderRadius: "0 0 8px 8px",
                    background: "linear-gradient(180deg,#34d399,#10b981)",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                  }}
                />
              )}

              {/* Shift-end reference line */}
              {shiftEndPct != null && (
                <div
                  style={{
                    position: "absolute",
                    left: -4,
                    right: -4,
                    top: `${shiftEndPct}%`,
                    height: 1.5,
                    background: "rgba(255,255,255,0.4)",
                    borderRadius: 1,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        ) : null}

        {/* Today dot */}
        {isToday && (
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#6366f1",
            }}
          />
        )}

        {/* Tooltip — anchored to bar canvas */}
        <AnimatePresence>
          {hovered && <DayTooltip day={day} shift={shift} />}
        </AnimatePresence>
      </div>

      {/* ── LABEL AREA (bottom LABEL_H px) ── */}
      <div
        style={{
          position: "absolute",
          top: CHART_H + 6,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div style={{ textAlign: "center", lineHeight: 1.3 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: isToday
                ? "#6366f1"
                : day.isFuture || day.isBeforeJoining
                  ? "#d1d5db"
                  : "#94a3b8",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {day.dayLabel}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: isToday ? 800 : 600,
              color: isToday
                ? "#6366f1"
                : day.isFuture || day.isBeforeJoining
                  ? "#e2e8f0"
                  : "#1e293b",
            }}
          >
            {day.dayNum}
          </div>
        </div>
        {!day.isBeforeJoining && !day.isFuture && (
          <StatusChip status={day.status} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Legend
───────────────────────────────────────────── */
function LegendDot({ color, gradient, label }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10.5,
        color: "#64748b",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 3,
          flexShrink: 0,
          background: gradient || color,
        }}
      />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────── */
function Skeleton() {
  return (
    <>
      {[0.55, 0.75, 0.42, 0.68, 0.5].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            height: CHART_H,
          }}
        >
          <div
            style={{
              width: "58%",
              height: CHART_H * h,
              borderRadius: 8,
              background:
                "linear-gradient(90deg,#f1f5f9 0%,#e8edf4 50%,#f1f5f9 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </div>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────
   Main
───────────────────────────────────────────── */
export default function AttendanceTimeline() {
  const { user } = useAuth();
  const userId = user?.id;

  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Y-axis tick values */
  const yLabels = [];
  for (let h = MIN; h <= MAX; h += 2) yLabels.push(h);
  const yLabelsReversed = [...yLabels].reverse(); // top → bottom

  const fetchTimeline = useCallback(
    async (offset) => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `${API}/attendance/timeline?weekOffset=${offset}`,
          { withCredentials: true },
        );
        setData(res.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchTimeline(weekOffset);
  }, [weekOffset, fetchTimeline]);

  // console.log(data);

  const summary = data
    ? [
        {
          label: "Present",
          count: data.days.filter(
            (d) => d.status === "PRESENT" || d.status === "LATE",
          ).length,
          color: "#6366f1",
        },
        {
          label: "Absent",
          count: data.days.filter((d) => d.status === "ABSENT").length,
          color: "#ef4444",
        },
        {
          label: "Late",
          count: data.days.filter((d) => d.lateDuration > 0).length,
          color: "#f97316",
        },
        {
          label: "Leave",
          count: data.days.filter((d) => d.status === "ON_LEAVE").length,
          color: "#06b6d4",
        },
        {
          label: "Overtime",
          count: data.days.filter((d) => d.overtimeDuration > 0).length,
          color: "#10b981",
        },
      ]
    : [];

  const shiftBand =
    data?.shift && !loading
      ? (() => {
          const sEnd = shiftTimeToDecimal(data.shift.endTime);
          const sStart = shiftTimeToDecimal(data.shift.startTime);
          return {
            top: `${hourToPct(sEnd)}%`,
            height: `${((sEnd - sStart) / RANGE) * 100}%`,
          };
        })()
      : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8edf4",
        borderRadius: 22,
        padding: "22px 22px 18px",
        boxShadow: "0 2px 20px rgba(15,23,42,0.06)",
        fontFamily: "'DM Sans', sans-serif",
        minHeight: 440,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Attendance Timeline
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              margin: "3px 0 0",
              fontWeight: 500,
            }}
          >
            {data ? formatWeekRange(data.weekStart, data.weekEnd) : "Loading…"}
            {data?.shift && (
              <span
                style={{ marginLeft: 8, color: "#a5b4fc", fontWeight: 600 }}
              >
                Shift:({data.shift.startTime}–{data.shift.endTime})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <NavArrow
            direction="left"
            disabled={loading || !!data?.isAtJoiningWeek}
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
            disabled={loading || !!data?.isAtCurrentWeek}
            onClick={() => setWeekOffset((o) => o + 1)}
          />
        </div>
      </div>

      {/* Legend */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <LegendDot
          gradient="linear-gradient(180deg,#6366f1,#4f46e5)"
          label="On time"
        />
        <LegendDot
          gradient="linear-gradient(180deg,#fb923c,#f97316)"
          label="Late"
        />
        <LegendDot
          gradient="linear-gradient(180deg,#34d399,#10b981)"
          label="Overtime"
        />
        <LegendDot color="#fca5a5" label="Absent" />
        <LegendDot color="rgba(6,182,212,0.3)" label="On leave" />
        <LegendDot color="rgba(16,185,129,0.2)" label="Holiday" />
        <LegendDot color="#e8edf4" label="Weekend" />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* ── Chart layout ───────────────────────────────────────────────
          Total height = CHART_H + LABEL_H.
          Y-axis ticks align to CHART_H only (positioned absolutely).
          Grid lines span CHART_H only.
          Day columns each own (CHART_H + LABEL_H) internally.
      ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, height: CHART_H + LABEL_H }}>
        {/* Y-axis column — ticks cover only CHART_H */}
        <div
          style={{
            width: 34,
            flexShrink: 0,
            position: "relative",
            height: CHART_H,
          }}
        >
          {yLabelsReversed.map((h, i) => (
            <div
              key={h}
              style={{
                position: "absolute",
                // spread evenly: i=0 → top:0%, i=last → top:100%
                top: `${(i / (yLabelsReversed.length - 1)) * 100}%`,
                right: 0,
                transform: "translateY(-50%)",
                fontSize: 8.5,
                color: "#c4cdd6",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Right side: grid + shift band + day columns */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Grid lines — only inside CHART_H */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: CHART_H,
              pointerEvents: "none",
            }}
          >
            {yLabelsReversed.map((h, i) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: `${(i / (yLabelsReversed.length - 1)) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: h % 4 === 0 ? "#edf0f5" : "#f6f8fb",
                }}
              />
            ))}
          </div>

          {shiftBand && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: CHART_H,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: shiftBand.top,
                  height: shiftBand.height,
                  background: "rgba(99,102,241,0.03)",
                  borderTop: "1.5px dashed rgba(99,102,241,0.15)",
                  borderBottom: "1.5px dashed rgba(99,102,241,0.15)",
                }}
              />
            </div>
          )}

          {/* Day columns */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: CHART_H + LABEL_H,
              display: "flex",
              gap: 5,
            }}
          >
            {loading ? (
              <Skeleton />
            ) : (
              data?.days?.map((day, i) => (
                <DayBar key={day.date} day={day} shift={data.shift} index={i} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      {data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          {summary
            .filter((s) => s.count > 0)
            .map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: 10,
                  padding: "5px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.count}
                </span>
                <span
                  style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}
                >
                  {s.label}
                </span>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  );
}
