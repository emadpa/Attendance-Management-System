import { motion } from "framer-motion";

import { useState, useEffect } from "react";

import { Icons } from "./ui/icons/iconPaths";
import Icon from "./ui/icons/Icon";
import { useIsMobile } from "../hooks/useIsMobile";

function daysBetween(s, e) {
  return Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;
}

export default function ApplyLeaveForm({
  leaveTypes,
  balances,
  onSubmit,
  submitLoading,
  submitError,
  onBack,
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [focused, setFocused] = useState("");

  const selectedBal = balances.find((b) => b.leaveTypeId === form.leaveTypeId);
  const days =
    form.startDate &&
    form.endDate &&
    new Date(form.endDate) >= new Date(form.startDate)
      ? daysBetween(form.startDate, form.endDate)
      : 0;
  const enoughBal =
    !selectedBal || selectedBal.allowed === 0 || days <= selectedBal.remaining;
  const today = new Date().toISOString().split("T")[0];

  const field = (name) => ({
    style: {
      width: "100%",
      padding: "11px 13px",
      boxSizing: "border-box",
      border: focused === name ? "1.5px solid #6366f1" : "1.5px solid #e2e8f0",
      borderRadius: 11,
      fontSize: isMobile ? 16 : 13.5,
      fontFamily: "'DM Sans', sans-serif",
      color: "#334155",
      background: focused === name ? "#fafafe" : "#f8fafc",
      outline: "none",
      transition: "all 0.18s",
      boxShadow: focused === name ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
      WebkitAppearance: "none",
      appearance: "none",
    },
    onFocus: () => setFocused(name),
    onBlur: () => setFocused(""),
  });

  const label = (text, hint) => (
    <div className="flex justify-between items-center mb-[7px]">
      <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
        {text}
      </span>

      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-50 bg-gradient-to-br from-slate-900 to-slate-800">
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onBack}
            className="w-[30px] h-[30px] rounded-lg border border-white/10 bg-white/10 flex items-center justify-center text-slate-400"
          >
            <Icon d={Icons.back} size={14} />
          </motion.button>
        )}

        <div>
          <h3 className="text-sm font-bold text-white font-serif">
            Apply for Leave
          </h3>
          <p className="text-[11px] text-slate-500 mt-[2px]">
            Submit a new leave request
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">
        {/* Leave Type */}
        <div>
          {label("Leave Type")}

          <select
            required
            value={form.leaveTypeId}
            onChange={(e) =>
              setForm((f) => ({ ...f, leaveTypeId: e.target.value }))
            }
            {...field("type")}
            className="w-full cursor-pointer"
          >
            <option value="">Select leave type…</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name} {lt.isPaid ? "(Paid)" : "(Unpaid)"}
              </option>
            ))}
          </select>

          {selectedBal && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <span className="text-[11.5px] text-slate-500">Balance</span>
              <span
                className={`text-xs font-bold ${
                  selectedBal.remaining > 0
                    ? "text-emerald-500"
                    : "text-red-500"
                }`}
              >
                {selectedBal.remaining} / {selectedBal.allowed} days
              </span>
            </motion.div>
          )}
        </div>

        {/* Dates */}
        <div
          className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
        >
          <div>
            {label("Start Date")}
            <input
              type="date"
              required
              min={today}
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              {...field("start")}
            />
          </div>

          <div>
            {label("End Date")}
            <input
              type="date"
              required
              min={form.startDate || today}
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              {...field("end")}
            />
          </div>
        </div>

        {/* Days Preview */}
        {days > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 p-2.5 rounded-xl border ${
              enoughBal
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <span
              className={`${enoughBal ? "text-emerald-500" : "text-red-500"}`}
            >
              <Icon d={enoughBal ? Icons.check : Icons.alert} size={14} />
            </span>

            <p
              className={`text-[12.5px] ${
                enoughBal ? "text-green-800" : "text-red-600"
              }`}
            >
              {days} day{days > 1 ? "s" : ""} selected —{" "}
              {enoughBal ? "you have enough balance" : "insufficient balance!"}
            </p>
          </motion.div>
        )}

        {/* Reason */}
        <div>
          {label("Reason", `${form.reason.length}/300`)}

          <textarea
            required
            rows={4}
            maxLength={300}
            placeholder="Briefly explain the reason for your leave…"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            {...field("reason")}
            className="resize-none"
          />
        </div>

        {/* Error */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200"
          >
            <span className="text-red-500">
              <Icon d={Icons.alert} size={14} />
            </span>
            <p className="text-[12.5px] text-red-600">{submitError}</p>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{
            scale: 1.01,
            boxShadow: "0 8px 24px rgba(99,102,241,0.28)",
          }}
          whileTap={{ scale: 0.98 }}
          disabled={
            submitLoading ||
            !enoughBal ||
            !form.leaveTypeId ||
            !form.startDate ||
            !form.endDate ||
            !form.reason
          }
          onClick={() => {
            if (!submitLoading && enoughBal) onSubmit(form);
          }}
          className={`w-full min-h-[46px] rounded-xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2
        ${
          submitLoading || !enoughBal
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-gradient-to-br from-indigo-500 to-purple-500 cursor-pointer"
        }`}
        >
          {submitLoading ? (
            <>
              <span className="w-[15px] h-[15px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Icon d={Icons.plus} size={14} /> Submit Request
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
