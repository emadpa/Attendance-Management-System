import { useState, useEffect, useRef } from "react";
import { motion, animate } from "framer-motion";
import axios from "axios";
import { PORT } from "../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function AnimatedNumber({ to, duration = 1.4, suffix = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ctrl = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = Math.round(v) + suffix;
      },
    });
    return () => ctrl.stop();
  }, [to, duration, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ─────────────────────────────────────────────
   Status config — light palette
───────────────────────────────────────────── */
const STATUS_CONFIG = {
  PRESENT: {
    label: "Present",
    color: "#059669",
    light: "#d1fae5",
    border: "#6ee7b7",
    textColor: "#065f46",
  },
  ABSENT: {
    label: "Absent",
    color: "#dc2626",
    light: "#fee2e2",
    border: "#fca5a5",
    textColor: "#991b1b",
  },
  LATE: {
    label: "Late",
    color: "#d97706",
    light: "#fef3c7",
    border: "#fcd34d",
    textColor: "#92400e",
  },
  ON_LEAVE: {
    label: "On Leave",
    color: "#7c3aed",
    light: "#ede9fe",
    border: "#c4b5fd",
    textColor: "#4c1d95",
  },
  HOLIDAY: {
    label: "Holiday",
    color: "#2563eb",
    light: "#dbeafe",
    border: "#93c5fd",
    textColor: "#1e3a8a",
  },
  HALF_DAY: {
    label: "Half Day",
    color: "#b45309",
    light: "#fef9c3",
    border: "#fde68a",
    textColor: "#78350f",
  },
};

/* ─────────────────────────────────────────────
   Arc helpers
───────────────────────────────────────────── */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/* ─────────────────────────────────────────────
   Arc Ring — light version
───────────────────────────────────────────── */
function ArcRing({ pct, color, trackColor }) {
  const size = 184;
  const cx = 92,
    cy = 92,
    r = 70,
    sw = 9;
  const start = -90;
  const full = 359.99;
  const endAngle = start + (pct / 100) * full;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="arc-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="4"
            floodColor={color}
            floodOpacity="0.25"
          />
        </filter>
      </defs>

      {/* Track ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={sw}
      />

      {/* Subtle tick marks */}
      {[0, 25, 50, 75].map((t) => {
        const angle = -90 + (t / 100) * 360;
        const rad = (angle * Math.PI) / 180;
        const outer = r + sw / 2 + 3;
        const inner = r - sw / 2 - 3;
        return (
          <line
            key={t}
            x1={cx + inner * Math.cos(rad)}
            y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)}
            y2={cy + outer * Math.sin(rad)}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Progress arc */}
      {pct > 0 && (
        <motion.path
          d={describeArc(cx, cy, r, start, endAngle)}
          fill="none"
          stroke="url(#arc-fill)"
          strokeWidth={sw}
          strokeLinecap="round"
          filter="url(#soft-shadow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      )}

      {/* End cap dot */}
      {pct > 1 && (
        <motion.circle
          cx={cx + r * Math.cos((endAngle * Math.PI) / 180)}
          cy={cy + r * Math.sin((endAngle * Math.PI) / 180)}
          r={sw / 2 + 1.5}
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.3, ease: "backOut" }}
          style={{ filter: `drop-shadow(0 2px 6px ${color}55)` }}
        />
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Stat chip
───────────────────────────────────────────── */
function StatChip({ label, value, dotColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-[3px] px-[14px] py-[10px] rounded-[14px] flex-1"
      style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
    >
      <span
        className="text-[22px] font-black leading-none tracking-tight"
        style={{ color: dotColor, fontFamily: "'DM Sans', sans-serif" }}
      >
        {value}
      </span>
      <span
        className="text-[9.5px] font-bold tracking-widest uppercase"
        style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Time card
───────────────────────────────────────────── */
function TimeCard({ label, time, date, icon, accentColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 rounded-[16px] p-[14px]"
      style={{ background: "#f8fafc", border: "1px solid #e8edf4" }}
    >
      <div className="flex items-center gap-[7px] mb-[8px]">
        <div
          className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}18` }}
        >
          {icon}
        </div>
        <span
          className="text-[9.5px] font-bold tracking-widest uppercase"
          style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </span>
      </div>
      {time ? (
        <>
          <p
            className="text-[20px] font-black leading-none tracking-tight"
            style={{ color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}
          >
            {time}
          </p>
          <p
            className="text-[10px] mt-[4px]"
            style={{ color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}
          >
            {date}
          </p>
        </>
      ) : (
        <p
          className="text-[20px] font-black leading-none"
          style={{ color: "#cbd5e1", fontFamily: "'DM Sans', sans-serif" }}
        >
          —
        </p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────── */
function Skeleton() {
  return (
    <div
      className="rounded-[24px] p-6 min-h-[200px] flex items-center justify-center"
      style={{ background: "#ffffff", border: "1px solid #e8edf4" }}
    >
      <div className="w-7 h-7 rounded-full border-[2.5px] border-indigo-200 border-t-indigo-500 animate-spin" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function AttendanceStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/attendance-status`, { withCredentials: true })
      .then((res) => {
        if (res.data.success) setData(res.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  console.log("Attendance status data:", data);

  if (loading || !data) return <Skeleton />;

  const {
    percentage = 0,
    presentDays = 0,
    totalDays = 0,
    todayPunchIn = null,
    todayPunchOut = null,
    status = "ABSENT",
  } = data;

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ABSENT;

  const arcColor =
    percentage >= 80 ? "#059669" : percentage >= 60 ? "#d97706" : "#dc2626";

  const trackColor =
    percentage >= 80 ? "#d1fae5" : percentage >= 60 ? "#fef3c7" : "#fee2e2";

  const absentDays = totalDays - presentDays;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e8edf4",
          boxShadow:
            "0 4px 24px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
        }}
      >
        {/* Decorative top bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, ${arcColor}60 0%, ${arcColor} 40%, ${arcColor}40 100%)`,
          }}
        />

        {/* Ambient tint behind the ring */}
        <div
          className="absolute top-0 left-0 w-[220px] h-[220px] pointer-events-none"
          style={{
            background: `radial-gradient(circle at 30% 40%, ${arcColor}09 0%, transparent 70%)`,
          }}
        />

        <div className="relative p-[22px]">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-[20px]">
            <div>
              <p
                className="text-[9.5px] font-bold tracking-[0.18em] uppercase mb-[3px]"
                style={{
                  color: "#94a3b8",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This Year
              </p>
              <h2
                className="text-[15px] font-bold leading-none"
                style={{
                  color: "#0f172a",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Attendance Overview
              </h2>
            </div>

            {/* Status pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: "backOut" }}
              className="flex items-center gap-[6px] px-[11px] py-[6px] rounded-full"
              style={{
                background: cfg.light,
                border: `1px solid ${cfg.border}`,
              }}
            >
              <span className="relative flex h-[7px] w-[7px] flex-shrink-0">
                {status === "PRESENT" && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                    style={{ background: cfg.color }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full h-[7px] w-[7px]"
                  style={{ background: cfg.color }}
                />
              </span>
              <span
                className="text-[10.5px] font-bold tracking-wide"
                style={{
                  color: cfg.textColor,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {cfg.label}
              </span>
            </motion.div>
          </div>

          {/* ── Body ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center gap-[20px]">
            {/* Arc ring + centre */}
            <div className="relative flex-shrink-0">
              <ArcRing
                pct={percentage}
                color={arcColor}
                trackColor={trackColor}
              />

              {/* Centre */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.p
                  className="font-black leading-none"
                  style={{
                    fontSize: 36,
                    color: "#0f172a",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: "backOut" }}
                >
                  <AnimatedNumber to={percentage} suffix="%" />
                </motion.p>
                <motion.p
                  className="text-[10px] font-bold tracking-widest uppercase mt-[4px]"
                  style={{
                    color: "#94a3b8",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Rate
                </motion.p>
                <motion.div
                  className="mt-[6px] px-[8px] py-[2px] rounded-full"
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <p
                    className="text-[10px] font-bold"
                    style={{
                      color: "#64748b",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {presentDays} <span style={{ color: "#cbd5e1" }}>of</span>{" "}
                    {totalDays} days
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 w-full flex flex-col gap-[14px]">
              {/* Stat chips */}
              <div className="flex gap-[8px]">
                <StatChip
                  label="Present"
                  value={presentDays}
                  dotColor="#059669"
                  delay={0.45}
                />
                <StatChip
                  label="Absent"
                  value={absentDays}
                  dotColor="#dc2626"
                  delay={0.52}
                />
                <StatChip
                  label="Total"
                  value={totalDays}
                  dotColor="#475569"
                  delay={0.59}
                />
              </div>

              {/* Progress bar */}
              {/* <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex justify-between items-center mb-[5px]">
                  <span
                    className="text-[9.5px] font-bold tracking-wider uppercase"
                    style={{
                      color: "#94a3b8",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Monthly Progress
                  </span>
                  <span
                    className="text-[9.5px] font-bold"
                    style={{
                      color: arcColor,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {percentage}%
                  </span>
                </div>
                <div
                  className="w-full h-[6px] rounded-full overflow-hidden"
                  style={{ background: trackColor }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${arcColor}bb, ${arcColor})`,
                      boxShadow: `0 1px 4px ${arcColor}55`,
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      delay: 0.5,
                      duration: 1.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </div>
              </motion.div> */}

              {/* Divider */}
              <div style={{ height: 1, background: "#f1f5f9" }} />

              {/* Clock in/out */}
              <div className="flex gap-[8px]">
                <TimeCard
                  label="Clock In"
                  time={fmtTime(todayPunchIn)}
                  date={fmtDate(todayPunchIn)}
                  accentColor="#059669"
                  delay={0.55}
                  icon={
                    <svg
                      width="13"
                      height="13"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#059669"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  }
                />
                <TimeCard
                  label="Clock Out"
                  time={fmtTime(todayPunchOut)}
                  date={fmtDate(todayPunchOut)}
                  accentColor="#6366f1"
                  delay={0.68}
                  icon={
                    <svg
                      width="13"
                      height="13"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#6366f1"
                      strokeWidth="2"
                    >
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
