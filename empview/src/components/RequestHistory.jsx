import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "./ui/icons/iconPaths";
import Icon from "./ui/icons/Icon";
import { useIsMobile } from "../hooks/useIsMobile";

const STATUS = {
  PENDING: {
    color: "#d97706",
    bg: "linear-gradient(135deg,#fffbeb,#fef3c7)",
    border: "#fde68a",
    dot: "#f59e0b",
    label: "Pending",
  },
  APPROVED: {
    color: "#059669",
    bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
    border: "#bbf7d0",
    dot: "#10b981",
    label: "Approved",
  },
  REJECTED: {
    color: "#dc2626",
    bg: "linear-gradient(135deg,#fef2f2,#fee2e2)",
    border: "#fecaca",
    dot: "#ef4444",
    label: "Rejected",
  },
  CANCELLED: {
    color: "#64748b",
    bg: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
    border: "#e2e8f0",
    dot: "#94a3b8",
    label: "Cancelled",
  },
};

function daysBetween(s, e) {
  return Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatDateShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}
function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px 3px 7px",
        borderRadius: 20,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

const FILTER_CONFIG = {
  ALL: { label: "All", color: "#6366f1" },
  PENDING: { label: "Pending", color: "#f59e0b" },
  APPROVED: { label: "Approved", color: "#10b981" },
  REJECTED: { label: "Rejected", color: "#ef4444" },
};

export default function RequestHistory({ requests, onCancel, cancelLoading }) {
  const [filter, setFilter] = useState("ALL");
  const isMobile = useIsMobile();

  const filtered =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      style={{ minHeight: 200 }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-50">
        <div
          className={`flex ${
            isMobile ? "flex-col items-start" : "items-center justify-between"
          } gap-3`}
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Leave History
            </h3>
            <p className="text-xs text-slate-400 mt-[2px]">
              {requests.length} total request{requests.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Filter pills */}
          <div
            className={`flex gap-[2px] p-[3px] rounded-xl bg-slate-50 border border-slate-100 ${
              isMobile ? "w-full" : ""
            }`}
          >
            {Object.entries(FILTER_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`
                  ${isMobile ? "flex-1" : ""}
                  px-2.5 py-1 rounded-lg text-[11px] font-semibold
                  transition-all duration-150 text-center flex items-center justify-center gap-1
                  ${
                    filter === key
                      ? "bg-white text-indigo-500 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }
                `}
              >
                {cfg.label}
                {counts[key] > 0 && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-[1px] rounded-full ${
                      filter === key
                        ? "bg-indigo-50 text-indigo-400"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
            <Icon d={Icons.leave} size={24} color="#cbd5e1" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            {filter === "ALL"
              ? "No leave requests yet"
              : `No ${FILTER_CONFIG[filter]?.label.toLowerCase()} requests`}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {filter === "ALL"
              ? "Submit your first leave request using the form."
              : "Try a different filter."}
          </p>
        </div>
      ) : isMobile ? (
        /* ── MOBILE CARDS ── */
        <div className="divide-y divide-slate-50">
          <AnimatePresence>
            {filtered.map((req, i) => {
              const days = daysBetween(req.startDate, req.endDate);
              const s = STATUS[req.status] || STATUS.PENDING;

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-4 py-4"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* Color bar */}
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ background: s.dot }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {req.leaveType?.name}
                        </p>
                        <span
                          className={`text-[10.5px] font-semibold ${
                            req.leaveType?.isPaid
                              ? "text-emerald-500"
                              : "text-slate-400"
                          }`}
                        >
                          {req.leaveType?.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <div className="ml-[14px] pl-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[12px] font-medium text-slate-700">
                        {formatDateShort(req.startDate)} →{" "}
                        {formatDateShort(req.endDate)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-[2px] rounded-full bg-slate-100 text-slate-500">
                        {days}d
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-400 line-clamp-2 mb-2.5">
                      {req.reason}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-[10.5px] text-slate-300">
                        {formatDate(req.createdAt)}
                      </span>

                      {req.status === "PENDING" && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onCancel(req.id)}
                          disabled={cancelLoading === req.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          <Icon d={Icons.trash} size={11} />
                          {cancelLoading === req.id ? "Cancelling…" : "Cancel"}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ── DESKTOP TABLE ── */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr
                style={{ background: "#fafafa" }}
                className="border-b border-slate-100"
              >
                {[
                  "Leave Type",
                  "Date Range",
                  "Days",
                  "Reason",
                  "Applied",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {filtered.map((req, i) => {
                  const days = daysBetween(req.startDate, req.endDate);
                  const s = STATUS[req.status] || STATUS.PENDING;

                  return (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Leave Type */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-[3px] h-8 rounded-full flex-shrink-0"
                            style={{ background: s.dot }}
                          />
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">
                              {req.leaveType?.name}
                            </p>
                            <p
                              className={`text-[10.5px] font-medium ${
                                req.leaveType?.isPaid
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {req.leaveType?.isPaid ? "Paid" : "Unpaid"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <span className="text-[12.5px] text-slate-600 whitespace-nowrap font-medium">
                          {formatDate(req.startDate)}
                        </span>
                        <span className="text-slate-300 mx-1.5">→</span>
                        <span className="text-[12.5px] text-slate-600 whitespace-nowrap font-medium">
                          {formatDate(req.endDate)}
                        </span>
                      </td>

                      {/* Days */}
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                          style={{
                            background: `${s.dot}18`,
                            color: s.dot,
                          }}
                        >
                          {days}d
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-[12.5px] text-slate-500 truncate">
                          {req.reason}
                        </p>
                      </td>

                      {/* Applied */}
                      <td className="px-4 py-3.5">
                        <span className="text-[11.5px] text-slate-400">
                          {formatDate(req.createdAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={req.status} />
                        {req.reviewerNotes && (
                          <p
                            className="text-[10px] text-slate-400 mt-1 truncate max-w-[120px]"
                            title={req.reviewerNotes}
                          >
                            📝 {req.reviewerNotes}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        {req.status === "PENDING" ? (
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onCancel(req.id)}
                            disabled={cancelLoading === req.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
                          >
                            <Icon d={Icons.trash} size={11} />
                            {cancelLoading === req.id ? "…" : "Cancel"}
                          </motion.button>
                        ) : (
                          <span className="text-[11px] text-slate-200">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
