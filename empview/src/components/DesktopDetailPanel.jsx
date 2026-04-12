import { motion } from "framer-motion";
import { STATUS } from "../constants/attendanceStatus";
import Icon from "./ui/icons/Icon";
import { Icons } from "./ui/icons/iconPaths";

import { formatTime, formatDuration, workHours } from "../utils/helper";

export default function DesktopDetailPanel({
  day,
  month0,
  year,
  record,
  onClose,
}) {
  const s = record ? STATUS[record.status] : null;
  const wh = record ? workHours(record.punchIn, record.punchOut) : null;
  const fullDate = new Date(year, month0, day).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = record
    ? [
        {
          icon: Icons.clock,
          label: "Clock In",
          value: formatTime(record.punchIn),
          accent: "#6366f1",
        },
        {
          icon: Icons.clock,
          label: "Clock Out",
          value: formatTime(record.punchOut),
          accent: "#8b5cf6",
        },
        {
          icon: Icons.sun,
          label: "Work Hours",
          value: wh ? `${wh} hrs` : "—",
          accent: "#10b981",
        },
        {
          icon: Icons.zap,
          label: "Late Duration",
          value: formatDuration(record.lateDuration),
          accent: "#f59e0b",
        },
        {
          icon: Icons.trend,
          label: "Overtime",
          value: formatDuration(record.overtimeDuration),
          accent: "#06b6d4",
        },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="overflow-hidden border-t border-[#f1f5f9]"
    >
      <div className="p-5">
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Date circle */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: s ? `${s.color}15` : "#f8fafc",
                border: `2px solid ${s?.color || "#e2e8f0"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: s?.color || "#94a3b8",
                  fontFamily: "Georgia, serif",
                }}
              >
                {day}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontFamily: "Georgia, serif",
                  margin: "0 0 4px",
                }}
              >
                {fullDate}
              </p>
              {s ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 20,
                    color: s.color,
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {s.label}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  No attendance record
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #f1f5f9",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon d={Icons.close} size={14} />
          </button>
        </div>

        {/* Stats grid */}
        {record ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
            }}
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  textAlign: "center",
                  background: `${stat.accent}08`,
                  border: `1px solid ${stat.accent}20`,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    margin: "0 auto 10px",
                    background: `${stat.accent}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.accent,
                  }}
                >
                  <Icon d={stat.icon} size={15} />
                </div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    fontFamily: "'DM Sans', sans-serif",
                    margin: "0 0 4px",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    fontFamily: "'DM Sans', sans-serif",
                    margin: 0,
                    letterSpacing: "0.04em",
                  }}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "20px 0",
              color: "#94a3b8",
            }}
          >
            <Icon d={Icons.info} size={18} />
            <p
              style={{
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              No attendance record found for this day
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
