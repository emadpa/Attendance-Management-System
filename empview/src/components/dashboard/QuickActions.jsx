import { motion } from "framer-motion";
import Icon from "../ui/icons/Icon";
import { Icons } from "../ui/icons/iconPaths";

export default function QuickActions({ onNavigate }) {
  const actions = [
    {
      label: "Mark Attendance",
      sub: "Quick punch-in",
      icon: Icons.check,
      accent: "#6366f1",
      page: "attendance",
    },
    {
      label: "Apply Leave",
      sub: "Request time off",
      icon: Icons.leave,
      accent: "#10b981",
      page: "leave-apply",
    },
    {
      label: "View Reports",
      sub: "Attendance report",
      icon: Icons.chart,
      accent: "#8b5cf6",
      page: "reports",
    },
    {
      label: "My Schedule",
      sub: "Monthly calendar",
      icon: Icons.calendar,
      accent: "#f59e0b",
      page: "schedule",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a, i) => (
        <motion.button
          key={i}
          whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate?.(a.page)}
          className="rounded-2xl p-4 text-left"
          style={{
            background: "#fff",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center"
            style={{ background: `${a.accent}15`, color: a.accent }}
          >
            <Icon d={a.icon} size={17} />
          </div>
          <p
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "#0f172a",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {a.label}
          </p>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {a.sub}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
