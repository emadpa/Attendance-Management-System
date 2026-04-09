import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Umbrella,
  Calendar,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import { PORT } from "../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_META = {
  PRESENT: {
    label: "Present",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.15)",
    dot: "#818cf8",
    Icon: CheckCircle,
  },
  LATE: {
    label: "Late",
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
    dot: "#fb923c",
    Icon: Clock,
  },
  ABSENT: {
    label: "Absent",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    dot: "#f87171",
    Icon: XCircle,
  },
  ON_LEAVE: {
    label: "On Leave",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.15)",
    dot: "#22d3ee",
    Icon: Umbrella,
  },
  HOLIDAY: {
    label: "Holiday",
    color: "#10b981",
    bg: "rgba(16,185,129,0.15)",
    dot: "#34d399",
    Icon: Calendar,
  },
  WEEKEND: {
    label: "Weekend",
    color: "#64748b",
    bg: "rgba(100,116,139,0.10)",
    dot: "#94a3b8",
    Icon: Calendar,
  },
  HALF_DAY: {
    label: "Half Day",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.15)",
    dot: "#a78bfa",
    Icon: Clock,
  },
  "N/A": {
    label: "—",
    color: "#475569",
    bg: "rgba(71,85,105,0.10)",
    dot: "#64748b",
    Icon: AlertCircle,
  },
};
const sm = (s) => STATUS_META[s] || STATUS_META["N/A"];

const LEAVE_ACCENTS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

function minsToLabel(m) {
  if (!m) return "0m";
  const h = Math.floor(m / 60),
    r = m % 60;
  return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}

/* ── Shimmer ──────────────────────────────────────────────── */
function Shimmer({ w = "100%", h = 20, r = 8, style = {} }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "rgba(255,255,255,0.06)",
        animation: "ar-shimmer 1.5s infinite",
        backgroundSize: "200% 100%",
        ...style,
      }}
    />
  );
}

/* ── Stat Card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent, icon: Icon, index, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.07,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: accent,
          opacity: 0.12,
        }}
      />
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: accent + "28",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon size={18} color={accent} strokeWidth={2.2} />
      </div>
      {loading ? (
        <>
          <Shimmer h={30} w="55%" r={6} style={{ marginBottom: 8 }} />
          <Shimmer h={12} w="75%" r={4} />
        </>
      ) : (
        <>
          <p
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            {value}
          </p>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 3,
            }}
          >
            {label}
          </p>
          {sub && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {sub}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

/* ── Donut ────────────────────────────────────────────────── */
function Donut({ data, loading }) {
  const size = 148,
    cx = 74,
    cy = 74,
    r = 54,
    sw = 20;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let off = 0;
  const slices = data.map((d) => {
    const pct = total > 0 ? d.value / total : 0;
    const s = {
      ...d,
      dash: pct * circ,
      gap: circ - pct * circ,
      offset: -off * circ,
    };
    off += pct;
    return s;
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={sw}
          />
          {loading ? (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={sw}
              strokeDasharray={`${circ * 0.6} ${circ * 0.4}`}
            />
          ) : (
            slices.map((s, i) => (
              <motion.circle
                key={s.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={s.offset}
                initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${s.dash} ${s.gap}` }}
                transition={{
                  delay: i * 0.1 + 0.3,
                  duration: 0.7,
                  ease: "easeOut",
                }}
              />
            ))
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <Shimmer w={36} h={22} r={4} />
          ) : (
            <>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {total}
              </p>
              <p
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginTop: 3,
                }}
              >
                days
              </p>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 110,
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        {loading
          ? [1, 2, 3, 4].map((i) => <Shimmer key={i} h={14} r={4} />)
          : slices.map((s) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
              return (
                <div
                  key={s.label}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: s.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.7)",
                      flex: 1,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}
                  >
                    {s.value}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.35)",
                      width: 30,
                      textAlign: "right",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}

/* ── Trend Bars ───────────────────────────────────────────── */
function TrendBars({ data, loading }) {
  const [tip, setTip] = useState(null);

  if (loading)
    return (
      <div className="h-[200px] flex items-end justify-center gap-1 px-1 pb-2 pt-6">
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-white/10 animate-pulse"
            style={{ height: `${40 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    );

  if (!data?.length)
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-[13px] text-white/30">No data</p>
      </div>
    );

  const maxH = Math.max(...data.map((d) => d.hoursWorked), 1);

  const barColor = (d) =>
    ({
      PRESENT: "#6366f1",
      LATE: "#f97316",
      ON_LEAVE: "#06b6d4",
      HOLIDAY: "#10b981",
      ABSENT: "#ef4444",
    })[d.status] ?? "#334155";

  return (
    <div className="relative">
      {/* Scroll container for mobile */}
      <div className="overflow-x-auto">
        <div className="h-[200px] flex items-end gap-2 pb-2 pt-6 min-w-[600px] sm:min-w-full">
          {data.map((d, i) => {
            const pct = d.hoursWorked > 0 ? (d.hoursWorked / maxH) * 100 : 0;
            const empty = d.hoursWorked === 0;
            const col = barColor(d);

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 h-full cursor-pointer flex-1 min-w-[14px] max-w-[28px]"
                onMouseEnter={() => setTip({ ...d, i })}
                onMouseLeave={() => setTip(null)}
                onClick={() =>
                  setTip((prev) => (prev?.i === i ? null : { ...d, i }))
                } // mobile tap
              >
                {/* Bar */}
                <div className="flex-1 w-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: empty ? 5 : `${Math.max(pct, 3)}%` }}
                    transition={{
                      delay: i * 0.018,
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full"
                    style={{
                      borderRadius: empty ? 3 : "4px 4px 2px 2px",
                      background: empty
                        ? `${col}30`
                        : `linear-gradient(180deg,${col}cc,${col})`,
                      border: empty ? `1.5px solid ${col}50` : "none",
                      boxShadow: !empty ? `0 -2px 8px ${col}40` : "none",
                    }}
                  />
                </div>

                {/* Label */}
                <span className="text-[8px] pt-2 text-white/40 whitespace-nowrap rotate-[-30deg] origin-top sm:rotate-0 sm:text-[10px]">
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 z-10 min-w-[140px] shadow-2xl pointer-events-none"
          >
            <p className="text-[11px] font-bold text-slate-100 mb-1">
              {tip.dayLabel}
            </p>

            {[
              {
                k: "Status",
                v: tip.status?.replace("_", " "),
                c: barColor(tip),
              },
              tip.hoursWorked > 0 && {
                k: "Hours",
                v: `${tip.hoursWorked}h`,
                c: "#e2e8f0",
              },
              tip.lateDuration > 0 && {
                k: "Late by",
                v: minsToLabel(tip.lateDuration),
                c: "#f97316",
              },
              tip.overtimeDuration > 0 && {
                k: "Overtime",
                v: minsToLabel(tip.overtimeDuration),
                c: "#10b981",
              },
            ]
              .filter(Boolean)
              .map((r) => (
                <div key={r.k} className="flex justify-between gap-3 mb-1">
                  <span className="text-[10px] text-white/40">{r.k}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: r.c }}
                  >
                    {r.v}
                  </span>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
/* ── Select ───────────────────────────────────────────────── */
function Select({ value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "9px 36px 9px 14px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: "#1e293b" }}
          >
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        color="rgba(255,255,255,0.5)"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ── PDF Export ───────────────────────────────────────────── */
function exportToPDF(data, monthLabel) {
  const { summary: s, records, breakdown } = data;

  const statusColors = {
    PRESENT: "#6366f1",
    LATE: "#f97316",
    ABSENT: "#ef4444",
    ON_LEAVE: "#06b6d4",
    HOLIDAY: "#10b981",
    WEEKEND: "#334155",
  };
  const statusLabel = {
    PRESENT: "Present",
    LATE: "Late",
    ABSENT: "Absent",
    ON_LEAVE: "On Leave",
    HOLIDAY: "Holiday",
    WEEKEND: "Weekend",
    HALF_DAY: "Half Day",
    "N/A": "—",
  };

  const tableRows = records
    .filter((r) => !r.isWeekend)
    .map(
      (r) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:9px 12px;font-weight:600;color:#0f172a;">${r.date}</td>
        <td style="padding:9px 12px;color:#64748b;">${r.dayName}</td>
        <td style="padding:9px 12px;">
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:${statusColors[r.status] ?? "#94a3b8"}18;color:${statusColors[r.status] ?? "#94a3b8"};">
            ${statusLabel[r.status] ?? r.status}
          </span>
        </td>
        <td style="padding:9px 12px;color:#334155;">${r.punchIn ?? "—"}</td>
        <td style="padding:9px 12px;color:#334155;">${r.punchOut ?? "—"}</td>
        <td style="padding:9px 12px;font-weight:600;color:#0f172a;">${r.hoursWorked ?? "—"}</td>
        <td style="padding:9px 12px;color:${r.lateDuration > 0 ? "#f97316" : "#94a3b8"};">${r.lateDuration > 0 ? minsToLabel(r.lateDuration) : "—"}</td>
        <td style="padding:9px 12px;color:${r.overtimeDuration > 0 ? "#10b981" : "#94a3b8"};">${r.overtimeDuration > 0 ? minsToLabel(r.overtimeDuration) : "—"}</td>
      </tr>
    `,
    )
    .join("");

  const breakdownBars = breakdown
    .map(
      (b) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:10px;height:10px;border-radius:3px;background:${b.color};flex-shrink:0;"></div>
      <span style="font-size:12px;color:#475569;flex:1;">${b.label}</span>
      <span style="font-size:13px;font-weight:800;color:#0f172a;">${b.value}</span>
    </div>
  `,
    )
    .join("");

  const rateColor =
    s.attendanceRate >= 90
      ? "#10b981"
      : s.attendanceRate >= 75
        ? "#f59e0b"
        : "#ef4444";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Attendance Report – ${monthLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #fff; color: #0f172a; padding: 40px 48px; }
    @media print {
      body { padding: 24px; }
      .no-break { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #f1f5f9;margin-bottom:28px;">
    <div>
      <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Attendance Report</p>
      <h1 style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;">${monthLabel}</h1>
      <p style="font-size:12px;color:#64748b;margin-top:4px;">Generated on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
    <div style="text-align:right;">
      <div style="font-size:48px;font-weight:900;color:${rateColor};line-height:1;letter-spacing:-0.04em;">${s.attendanceRate}%</div>
      <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-top:4px;">ATTENDANCE RATE</div>
    </div>
  </div>

  <!-- Stats grid -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px;" class="no-break">
    ${[
      { label: "Present", value: s.presentDays, color: "#6366f1" },
      { label: "Absent", value: s.absentDays, color: "#ef4444" },
      { label: "Late", value: s.lateDays, color: "#f97316" },
      { label: "On Leave", value: s.leaveDays, color: "#06b6d4" },
      { label: "Avg Hours", value: `${s.avgDailyHours}h`, color: "#8b5cf6" },
    ]
      .map(
        (c) => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
        <div style="font-size:24px;font-weight:900;color:${c.color};letter-spacing:-0.02em;margin-bottom:4px;">${c.value}</div>
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;">${c.label}</div>
      </div>
    `,
      )
      .join("")}
  </div>

  <!-- Breakdown + Leave Balances side by side -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;" class="no-break">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;">
      <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Status Breakdown</p>
      ${breakdownBars}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;">
        <span style="font-size:11px;color:#94a3b8;">Late total</span>
        <span style="font-size:11px;font-weight:700;color:#f97316;">${s.totalLateLabel}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;">
        <span style="font-size:11px;color:#94a3b8;">Overtime total</span>
        <span style="font-size:11px;font-weight:700;color:#10b981;">${s.totalOvertimeLabel}</span>
      </div>
    </div>
  </div>

  <!-- Daily Records Table -->
  <div>
    <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">Daily Records</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f8fafc;">
          ${[
            "Date",
            "Day",
            "Status",
            "Clock In",
            "Clock Out",
            "Hours",
            "Late",
            "Overtime",
          ]
            .map(
              (h) =>
                `<th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #e2e8f0;">${h}</th>`,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

/* ── Main Page ────────────────────────────────────────────── */
export default function AttendanceReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchReport = useCallback(async (y, m) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `${API}/attendance/report?year=${y}&month=${m}`,
        { withCredentials: true },
      );
      if (res.data.success) setData(res.data.data);
      else throw new Error(res.data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(year, month);
  }, [year, month, fetchReport]);

  const handleExport = () => {
    if (!data || loading) return;
    setExporting(true);
    try {
      exportToPDF(data, data.monthLabel);
    } finally {
      setTimeout(() => setExporting(false), 1200);
    }
  };

  const s = data?.summary;
  const yearOpts = Array.from({ length: 6 }, (_, i) => ({
    value: now.getFullYear() - i,
    label: now.getFullYear() - i,
  }));
  const monthOpts = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  const statCards = [
    {
      label: "Attendance Rate",
      value: loading ? "—" : `${s?.attendanceRate ?? 0}%`,
      sub: loading ? "" : `${s?.presentDays} of ${s?.totalDays} days`,
      accent: "#6366f1",
      icon: CheckCircle,
    },
    {
      label: "Days Present",
      value: loading ? "—" : (s?.presentDays ?? 0),
      sub: loading
        ? ""
        : `${s?.lateDays} late arrival${s?.lateDays !== 1 ? "s" : ""}`,
      accent: "#10b981",
      icon: CheckCircle,
    },
    {
      label: "Days Absent",
      value: loading ? "—" : (s?.absentDays ?? 0),
      sub: loading ? "" : `${s?.leaveDays} on approved leave`,
      accent: "#ef4444",
      icon: XCircle,
    },
    {
      label: "Avg Daily Hours",
      value: loading ? "—" : `${s?.avgDailyHours ?? 0}h`,
      sub: loading ? "" : `Shift target: ${s?.shiftHours ?? 8}h`,
      accent: "#f59e0b",
      icon: Clock,
    },
    {
      label: "Total Overtime",
      value: loading ? "—" : (s?.totalOvertimeLabel ?? "0m"),
      sub: loading ? "" : `Late total: ${s?.totalLateLabel ?? "0m"}`,
      accent: "#8b5cf6",
      icon: AlertCircle,
    },
  ];

  return (
    <div
      style={{
        fontFamily: "'DM Sans',sans-serif",
        minHeight: "100vh",
        background:
          "linear-gradient(145deg,#0f172a 0%,#1a2540 50%,#0f172a 100%)",
        padding: "28px 24px 56px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes ar-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        select option { background:#1e293b; color:#fff; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4 mb-7"
        >
          {/* Title */}
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-extrabold text-white tracking-[-0.03em] m-0">
              Attendance Report
            </h1>

            {data && !loading && (
              <p className="text-[12px] text-white/40 mt-1">
                {data.monthLabel}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <Select
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
              options={monthOpts}
            />

            <Select
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              options={yearOpts}
            />

            <motion.button
              whileHover={
                !loading && !exporting
                  ? {
                      scale: 1.03,
                      boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                    }
                  : {}
              }
              whileTap={!loading && !exporting ? { scale: 0.97 } : {}}
              onClick={handleExport}
              disabled={loading || exporting || !data}
              className={`
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold
        transition-all duration-200 font-inherit
        ${
          loading || !data
            ? "bg-white/10 text-white/30 cursor-not-allowed"
            : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg"
        }
      `}
            >
              {exporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download size={15} />
                  Export PDF
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(185px,1fr))] gap-3 mb-5">
          {statCards.map((c, i) => (
            <StatCard key={c.label} {...c} index={i} loading={loading} />
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-5 items-start">
          {/* Trend */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 pb-3 min-h-[360px]"
          >
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-[13px] font-bold text-white m-0">
                  Daily Attendance
                </h3>
                <p className="text-[11px] text-white/40 mt-[2px]">
                  Hours worked per weekday
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[
                  ["#6366f1", "Present"],
                  ["#f97316", "Late"],
                  ["#06b6d4", "Leave"],
                  ["#ef4444", "Absent"],
                  ["#10b981", "Holiday"],
                ].map(([c, l]) => (
                  <span
                    key={l}
                    className="flex items-center gap-1 text-[10px] text-white/50"
                  >
                    <span
                      className="w-2 h-2 rounded-sm inline-block"
                      style={{ background: c }}
                    />
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <TrendBars data={data?.trend ?? []} loading={loading} />
          </motion.div>

          {/* Donut */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 min-h-[360px]"
          >
            <h3 className="text-[13px] font-bold text-white mb-1">Breakdown</h3>
            <p className="text-[11px] text-white/40 mb-4">
              Status distribution
            </p>

            <Donut data={data?.breakdown ?? []} loading={loading} />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="detailed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                }}
              >
                Daily Records
              </h3>
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                }}
              >
                All weekdays for the selected month
              </p>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <Shimmer key={i} h={44} r={8} />
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                      {[
                        "Date",
                        "Day",
                        "Status",
                        "Clock In",
                        "Clock Out",
                        "Hours",
                        "Late",
                        "Overtime",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "11px 16px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.records ?? [])
                      .filter((r) => !r.isWeekend)
                      .map((r, i) => {
                        const meta = sm(r.status);
                        const Icon = meta.Icon;
                        return (
                          <motion.tr
                            key={r.dateRaw}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td
                              style={{
                                padding: "12px 16px",
                                fontWeight: 600,
                                color: "#fff",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.date}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: "rgba(255,255,255,0.4)",
                                fontWeight: 500,
                              }}
                            >
                              {r.dayName}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "3px 10px",
                                  borderRadius: 99,
                                  background: meta.bg,
                                  color: meta.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Icon size={11} strokeWidth={2.5} />
                                {meta.label}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: r.punchIn
                                  ? "#c7d2fe"
                                  : "rgba(255,255,255,0.2)",
                                fontWeight: r.punchIn ? 600 : 400,
                              }}
                            >
                              {r.punchIn ?? "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color: r.punchOut
                                  ? "#c7d2fe"
                                  : "rgba(255,255,255,0.2)",
                                fontWeight: r.punchOut ? 600 : 400,
                              }}
                            >
                              {r.punchOut ?? "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontWeight: 700,
                                color: r.hoursWorked
                                  ? "#fff"
                                  : "rgba(255,255,255,0.2)",
                              }}
                            >
                              {r.hoursWorked ?? "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color:
                                  r.lateDuration > 0
                                    ? "#fb923c"
                                    : "rgba(255,255,255,0.2)",
                                fontWeight: r.lateDuration > 0 ? 600 : 400,
                              }}
                            >
                              {r.lateDuration > 0
                                ? minsToLabel(r.lateDuration)
                                : "—"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                color:
                                  r.overtimeDuration > 0
                                    ? "#34d399"
                                    : "rgba(255,255,255,0.2)",
                                fontWeight: r.overtimeDuration > 0 ? 600 : 400,
                              }}
                            >
                              {r.overtimeDuration > 0
                                ? minsToLabel(r.overtimeDuration)
                                : "—"}
                            </td>
                          </motion.tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ar-chart-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
