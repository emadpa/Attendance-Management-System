import { motion } from "framer-motion";
import { STATUS } from "../constants/attendanceStatus";
import Icon from "./ui/icons/Icon";
import { Icons } from "./ui/icons/iconPaths";

import { formatTime, formatDuration, workHours } from "../utils/helper";

export default function MobileDetailPanel({
  day,
  month0,
  year,
  record,
  onClose,
}) {
  // console.log(record);
  const s = record ? STATUS[record.status] : null;
  const wh = record ? workHours(record.punchIn, record.punchOut) : null;

  const rows = record
    ? [
        {
          icon: Icons.clock,
          label: "Clock In",
          value: formatTime(record.punchIn),
        },
        {
          icon: Icons.clock,
          label: "Clock Out",
          value: formatTime(record.punchOut),
        },
        { icon: Icons.sun, label: "Work Hours", value: wh ? `${wh} hrs` : "—" },
        {
          icon: Icons.zap,
          label: "Late Duration",
          value: formatDuration(record.lateDuration),
        },
        {
          icon: Icons.trend,
          label: "Overtime",
          value: formatDuration(record.overtimeDuration),
        },
      ]
    : [];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "#fff",
        borderRadius: "22px 22px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}
    >
      {/* Handle */}
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 14 }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "#e2e8f0",
          }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          padding: "14px 20px 12px",
          borderBottom: "1px solid #f1f5f9",
          background: s ? s.bg : "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: "Georgia, serif",
              margin: 0,
            }}
          >
            {new Date(year, month0, day).toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
            })}
          </p>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0" }}>
            {new Date(year, month0, day).toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {s && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 20,
                color: s.color,
                background: s.bg,
                border: `1px solid ${s.border}`,
              }}
            >
              {s.label}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: 9,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <Icon d={Icons.close} size={14} />
          </button>
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: "18px 20px 40px" }}>
        {record ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 11,
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                    }}
                  >
                    <Icon d={r.icon} size={15} />
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {r.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0f172a",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              fontSize: 14,
              color: "#94a3b8",
              textAlign: "center",
              padding: "24px 0",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            No attendance record for this day
          </p>
        )}
      </div>
    </motion.div>
  );
}
