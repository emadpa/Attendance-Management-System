import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../App";
import { PORT } from "../constants/port";
import Loading from "../components/Loading";

const API = `http://localhost:${PORT}/api/employee`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function tenure(joinDate) {
  if (!joinDate) return "—";

  const start = new Date(joinDate);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  // Adjust negatives
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Build readable string
  let parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);

  return parts.join(" ") || "0d";
}
function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
const PALETTES = [
  ["#6366f1", "#8b5cf6"],
  ["#0891b2", "#06b6d4"],
  ["#059669", "#10b981"],
  ["#d97706", "#f59e0b"],
  ["#dc2626", "#ef4444"],
  ["#7c3aed", "#a78bfa"],
];
function avatarGrad(name) {
  const [a, b] = PALETTES[(name || "").charCodeAt(0) % PALETTES.length];
  return `linear-gradient(135deg,${a},${b})`;
}
function fmtPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, push };
}
function ToastStack({ toasts }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 48, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold font-[DM_Sans] w-full sm:max-w-xs pointer-events-auto
              ${
                t.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0
              ${t.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
            >
              {t.type === "success" ? "✓" : "!"}
            </span>
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Form atoms ──────────────────────────────────────────────────────────── */
function FieldLabel({ children, required }) {
  return (
    <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  disabled,
  maxLength,
  required,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`h-10 rounded-xl px-3 text-[13px] font-medium font-[DM_Sans] outline-none transition-all duration-150 w-full
          ${
            disabled
              ? "bg-slate-50 border border-slate-100 text-slate-400 cursor-not-allowed"
              : error
                ? "bg-white border-2 border-red-400 text-slate-800"
                : focused
                  ? "bg-white border-2 border-indigo-400 text-slate-800 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"
                  : "bg-white border border-slate-200 text-slate-800 hover:border-slate-300"
          }`}
      />
      {error && (
        <span className="text-[10.5px] text-red-500 font-[DM_Sans]">
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="text-[10.5px] text-slate-400 font-[DM_Sans]">
          {hint}
        </span>
      )}
    </div>
  );
}

function SelectInput({ label, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 rounded-xl px-3 text-[13px] font-medium font-[DM_Sans] outline-none border transition-all duration-150 bg-white cursor-pointer
          ${error ? "border-red-400" : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[10.5px] text-red-500 font-[DM_Sans]">
          {error}
        </span>
      )}
    </div>
  );
}

function PwInput({ label, value, onChange, error }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`h-10 w-full rounded-xl px-3 pr-10 text-[13px] font-medium font-[DM_Sans] outline-none transition-all duration-150
            ${
              error
                ? "bg-white border-2 border-red-400 text-slate-800"
                : focused
                  ? "bg-white border-2 border-indigo-400 text-slate-800 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"
                  : "bg-white border border-slate-200 text-slate-800 hover:border-slate-300"
            }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? (
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <span className="text-[10.5px] text-red-500 font-[DM_Sans]">
          {error}
        </span>
      )}
    </div>
  );
}

/* ─── Password strength ───────────────────────────────────────────────────── */
function PwStrength({ pw }) {
  if (!pw) return null;
  const checks = [
    { label: "8+ chars", ok: pw.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(pw) },
    { label: "Number", ok: /\d/.test(pw) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const clrBar =
    ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500"][
      score - 1
    ] || "bg-slate-200";
  const clrTxt =
    ["text-red-500", "text-orange-500", "text-amber-600", "text-emerald-600"][
      score - 1
    ] || "";
  const lbl = ["Weak", "Fair", "Good", "Strong"][score - 1] || "";
  return (
    <div className="mt-1 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? clrBar : "bg-slate-100"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] font-[DM_Sans] flex items-center gap-1 ${c.ok ? "text-emerald-600" : "text-slate-300"}`}
            >
              {c.ok ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-[10px] font-bold font-[DM_Sans] ${clrTxt}`}>
            {lbl}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── OTP boxes ───────────────────────────────────────────────────────────── */
function OtpBoxes({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const digits = value
    .split("")
    .concat(Array(length).fill(""))
    .slice(0, length);
  const handle = (i, val) => {
    const raw = val.replace(/\D/g, "").slice(-1);
    const arr = digits.slice();
    arr[i] = raw;
    onChange(arr.join(""));
    if (raw && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0)
      refs.current[i - 1]?.focus();
  };
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          maxLength={1}
          value={d}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          style={{ height: 48 }}
          className={`flex-1 min-w-0 text-center text-lg sm:text-xl font-black font-[DM_Sans] rounded-xl outline-none transition-all duration-150
            ${d ? "border-2 border-indigo-500 bg-indigo-50 text-indigo-700" : "border border-slate-200 bg-slate-50 text-slate-800"}
            focus:border-2 focus:border-indigo-500 focus:bg-indigo-50`}
        />
      ))}
    </div>
  );
}

/* ─── Button ──────────────────────────────────────────────────────────────── */
function Btn({
  children,
  onClick,
  loading,
  disabled,
  variant = "primary",
  size = "md",
  color = "indigo",
}) {
  const sizeMap = {
    sm: "h-8 px-3 text-[11.5px]",
    md: "h-10 px-5 text-[12.5px]",
    lg: "h-11 px-6 text-[13px]",
  };
  const ghostStyle =
    "bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300";
  const gradients = {
    indigo: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    emerald: "linear-gradient(135deg,#059669,#10b981)",
    violet: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    red: "linear-gradient(135deg,#dc2626,#ef4444)",
  };
  const isPrimary = variant === "primary";
  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-bold font-[DM_Sans] rounded-xl transition-all duration-150 select-none w-auto  ${sizeMap[size]} ${!isPrimary ? ghostStyle : ""}`}
      style={
        isPrimary
          ? {
              background:
                disabled || loading
                  ? "#e2e8f0"
                  : gradients[color] || gradients.indigo,
              color: disabled || loading ? "#94a3b8" : "#fff",
              boxShadow:
                !disabled && !loading
                  ? "0 2px 8px rgba(99,102,241,0.22)"
                  : "none",
              cursor: disabled || loading ? "not-allowed" : "pointer",
            }
          : {}
      }
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  );
}

/* ─── Section card ────────────────────────────────────────────────────────── */
function Card({
  title,
  subtitle,
  icon,
  accent = "#6366f1",
  action,
  delay = 0,
  children,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-50 bg-gradient-to-br from-slate-50/80 to-slate-50/40">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accent}15, ${accent}25)`,
            }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-[12px] md:text-[14px] font-extrabold text-slate-900 font-[DM_Sans] leading-none">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10.5px] text-slate-400 mt-0.5 font-[DM_Sans]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </motion.div>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxW = "max-w-lg",
}) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-[210] md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bottom-0 left-0 right-0  w-full ${maxW} max-h-[92vh] overflow-y-auto bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl`}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-4 sm:px-6 pt-5 pb-4 border-b border-slate-100 rounded-t-2xl flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-extrabold text-slate-900 font-[DM_Sans] leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[11.5px] text-slate-400 mt-0.5 font-[DM_Sans]">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0 mt-0.5"
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Divider ─────────────────────────────────────────────────────────────── */
function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-100" />
      {label && (
        <span className="text-[9.5px] font-bold tracking-widest uppercase text-slate-300 font-[DM_Sans] whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* ─── Edit Personal Modal ─────────────────────────────────────────────────── */
function EditPersonalModal({ open, onClose, profile, onSaved, push }) {
  const [form, setForm] = useState({
    mobileNumber: "",
    gender: "",
    dob: "",
    ecName: "",
    ecPhone: "",
    ecRelation: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (profile && open) {
      setForm({
        mobileNumber: profile.mobileNumber || "",
        gender: profile.gender || "",
        dob: profile.dob
          ? new Date(profile.dob).toISOString().split("T")[0]
          : "",
        ecName: profile.emergencyContactName || "",
        ecPhone: profile.emergencyContactPhone || "",
        ecRelation: profile.emergencyContactRelation || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pinCode: profile.pinCode || "",
      });
      setErrors({});
    }
  }, [profile, open]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (form.mobileNumber && form.mobileNumber.replace(/\D/g, "").length < 10)
      e.mobileNumber = "Enter a valid 10-digit number";
    if (form.ecPhone && form.ecPhone.replace(/\D/g, "").length < 10)
      e.ecPhone = "Enter a valid number";
    if (form.pinCode && form.pinCode.length !== 6)
      e.pinCode = "Enter a valid 6-digit PIN code";
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mobileNumber: form.mobileNumber || null,
        gender: form.gender || null,
        dob: form.dob || null,
        emergencyContactName: form.ecName || null,
        emergencyContactPhone: form.ecPhone || null,
        emergencyContactRelation: form.ecRelation || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pinCode: form.pinCode || null,
      };
      await axios.patch(`${API}/profile/update-personal`, payload, {
        withCredentials: true,
      });
      onSaved(payload);
      push("Personal information updated");
      onClose();
    } catch (err) {
      push(err?.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Personal Information"
      maxW="max-w-2xl"
    >
      <div className="px-4 sm:px-6 py-5 space-y-6">
        <div>
          {/* <SectionDivider label="Basic Info" /> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Mobile Number"
              value={form.mobileNumber}
              onChange={(v) => set("mobileNumber", fmtPhone(v))}
              placeholder="000-000-0000"
              error={errors.mobileNumber}
              hint="Primary contact number"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(v) => set("dob", v)}
              error={errors.dob}
            />
            <SelectInput
              label="Gender"
              value={form.gender}
              onChange={(v) => set("gender", v)}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>
        </div>

        <div>
          <SectionDivider label="Address" />
          <div className="grid grid-cols-1 gap-4 mt-4">
            <Input
              label="Street Address"
              value={form.address}
              onChange={(v) => set("address", v)}
              placeholder="House no., Street name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                value={form.city}
                onChange={(v) => set("city", v)}
                placeholder="City"
              />
              <Input
                label="State"
                value={form.state}
                onChange={(v) => set("state", v)}
                placeholder="State"
              />
              <Input
                label="PIN Code"
                value={form.pinCode}
                onChange={(v) =>
                  set("pinCode", v.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                error={errors.pinCode}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionDivider label="Emergency Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Contact Name"
              value={form.ecName}
              onChange={(v) => set("ecName", v)}
              placeholder="Full name"
            />
            <Input
              label="Relationship"
              value={form.ecRelation}
              onChange={(v) => set("ecRelation", v)}
              placeholder="e.g. Spouse, Parent"
            />
            <Input
              label="Contact Number"
              value={form.ecPhone}
              onChange={(v) => set("ecPhone", fmtPhone(v))}
              error={errors.ecPhone}
              placeholder="000-000-0000"
            />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-4 border-t border-slate-100 rounded-b-2xl flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
        <Btn variant="ghost" onClick={onClose} size="md">
          Cancel
        </Btn>
        <Btn onClick={save} loading={saving} size="md">
          Save Changes
        </Btn>
      </div>
    </Modal>
  );
}

/* ─── Change Password Modal (3-step) ──────────────────────────────────────── */
function ChangePasswordModal({ open, onClose, push }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(0);
    setForm({ current: "", next: "", confirm: "" });
    setErrors({});
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const pwChecks = [
    { label: "8+ characters", ok: form.next.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(form.next) },
    { label: "Number", ok: /\d/.test(form.next) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(form.next) },
  ];
  const pwScore = pwChecks.filter((c) => c.ok).length;

  const proceed = async () => {
    if (step === 0) {
      if (!form.current) {
        setErrors({ current: "Required" });
        return;
      }
      setErrors({});
      setStep(1);
    } else if (step === 1) {
      if (form.next.length < 8) {
        setErrors({ next: "Min 8 characters" });
        return;
      }
      setErrors({});
      setStep(2);
    } else {
      if (form.next !== form.confirm) {
        setErrors({ confirm: "Passwords do not match" });
        return;
      }
      setSaving(true);

      try {
        await axios.patch(
          `${API}/profile/update-password`,
          { currentPassword: form.current, newPassword: form.next },
          { withCredentials: true },
        );
        push("Password changed successfully");
        handleClose();
      } catch (e) {
        if (e?.response?.status === 400) {
          setStep(0);
          setErrors({ current: e.response.data.message });
        } else {
          push(
            e?.response?.data?.message || "Failed to update password",
            "error",
          );
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const stepMeta = [
    { icon: "🔑", label: "Verify identity" },
    { icon: "🔒", label: "New password" },
    { icon: "✓", label: "Confirm" },
  ];
  const scoreBar =
    ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500"][
      pwScore - 1
    ] || "bg-slate-200";
  const scoreLbl =
    ["text-red-500", "text-orange-500", "text-amber-600", "text-emerald-600"][
      pwScore - 1
    ] || "";
  const scoreTxt = ["Weak", "Fair", "Good", "Strong"][pwScore - 1] || "";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change Password"
      subtitle="Your identity is verified before any change"
      maxW="max-w-md"
    >
      <div className="px-4 sm:px-6 pt-5 pb-2">
        {/* Step pills */}
        <div className="flex items-center gap-0 mb-7">
          {stepMeta.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-[DM_Sans] transition-all duration-300 flex-shrink-0
                ${i < step ? "bg-indigo-600 text-white" : i === step ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1" : "bg-slate-100 text-slate-400"}`}
              >
                {i < step ? "✓" : s.icon}
              </div>
              {i < stepMeta.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${i < step ? "bg-indigo-500" : "bg-slate-100"}`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-[10.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] mb-4">
          Step {step + 1} — {stepMeta[step].label}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-amber-500 text-base flex-shrink-0">
                    ⚠
                  </span>
                  <p className="text-[11.5px] text-amber-700 font-[DM_Sans]">
                    Enter your <strong>current password</strong> to verify your
                    identity before making changes.
                  </p>
                </div>
                <PwInput
                  label="Current Password"
                  value={form.current}
                  onChange={(v) => {
                    setForm((p) => ({ ...p, current: v }));
                    setErrors({});
                  }}
                  error={errors.current}
                />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-3">
                <PwInput
                  label="New Password"
                  value={form.next}
                  onChange={(v) => {
                    setForm((p) => ({ ...p, next: v }));
                    setErrors({});
                  }}
                  error={errors.next}
                />
                <PwStrength pw={form.next} />
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2 mt-1">
                  {pwChecks.map((c) => (
                    <div
                      key={c.label}
                      className={`flex items-center gap-2 text-[11.5px] font-[DM_Sans] transition-colors ${c.ok ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 transition-all ${c.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}
                      >
                        {c.ok ? "✓" : "○"}
                      </span>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <PwInput
                  label="Confirm New Password"
                  value={form.confirm}
                  onChange={(v) => {
                    setForm((p) => ({ ...p, confirm: v }));
                    setErrors({});
                  }}
                  error={errors.confirm}
                />
                {form.confirm && form.next === form.confirm && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                      ✓
                    </span>
                    <span className="text-[12px] text-emerald-700 font-semibold font-[DM_Sans]">
                      Passwords match
                    </span>
                  </motion.div>
                )}
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] mb-2">
                    Strength
                  </p>
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i < pwScore ? scoreBar : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[10.5px] font-bold font-[DM_Sans] ${scoreLbl}`}
                  >
                    {scoreTxt}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mt-3">
        {step > 0 ? (
          <Btn variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
            ← Back
          </Btn>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Btn
          onClick={proceed}
          loading={saving}
          color={step === 2 ? "emerald" : "indigo"}
        >
          {step < 2 ? "Continue →" : "Update Password"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ─── Change Email Modal ──────────────────────────────────────────────────── */
/* ─── Change Email Modal (3-stage) ────────────────────────────────────────────
   Stage 0 — "verify"  : user enters current password
   Stage 1 — "email"   : user enters new email address
   Stage 2 — "otp"     : user enters 6-digit OTP sent to new email
────────────────────────────────────────────────────────────────────────────── */
function ChangeEmailModal({ open, onClose, currentEmail, onSaved, push }) {
  /* ── state ── */
  const [stage, setStage] = useState("verify"); // "verify" | "email" | "otp"
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [verifying, setVerifying] = useState(false); // step 0 spinner
  const [sending, setSending] = useState(false); // step 1 send-OTP spinner
  const [confirming, setConfirming] = useState(false); // step 2 verify-OTP spinner

  /* ── countdown timer ── */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  /* ── reset & close ── */
  const reset = () => {
    setStage("verify");
    setPassword("");
    setNewEmail("");
    setOtp("");
    setError("");
    setCountdown(0);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  /* ── step meta ── */
  const STEPS = [
    { key: "verify", icon: "🔑", label: "Verify identity" },
    { key: "email", icon: "✉️", label: "New email" },
    { key: "otp", icon: "🔢", label: "Confirm code" },
  ];
  const stageIdx = STEPS.findIndex((s) => s.key === stage);

  /* ════════════════════════════════════════════
     STEP 0 — verify current password
  ════════════════════════════════════════════ */
  const handleVerifyPassword = async () => {
    if (!password) {
      setError("Please enter your current password");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await axios.post(
        `${API}/profile/verify-password`,
        { password },
        { withCredentials: true },
      );
      setStage("email");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Incorrect password. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  /* ════════════════════════════════════════════
     STEP 1 — send OTP to new email
  ════════════════════════════════════════════ */
  const handleSendOtp = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError("Enter a valid email address");
      return;
    }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError("New email must be different from your current one");
      return;
    }
    setSending(true);
    setError("");
    try {
      await axios.post(
        `${API}/profile/email/send-otp`,
        { newEmail },
        { withCredentials: true },
      );
      setStage("otp");
      setCountdown(60);
      push("Verification code sent to " + newEmail);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send code. Try again.");
    } finally {
      setSending(false);
    }
  };

  /* ════════════════════════════════════════════
     STEP 2 — verify OTP & update email
  ════════════════════════════════════════════ */
  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setConfirming(true);
    setError("");
    try {
      await axios.post(
        `${API}/profile/email/verify-otp`,
        { newEmail, otp },
        { withCredentials: true },
      );
      push("Email updated successfully");
      onSaved(newEmail);
      handleClose();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Invalid or expired code. Try again.",
      );
    } finally {
      setConfirming(false);
    }
  };

  /* ════════════════════════════════════════════
     STEP handlers dispatch
  ════════════════════════════════════════════ */
  const handlePrimary = () => {
    if (stage === "verify") handleVerifyPassword();
    else if (stage === "email") handleSendOtp();
    else handleVerifyOtp();
  };

  const primaryLoading = verifying || sending || confirming;
  const primaryDisabled = stage === "otp" && otp.length < 6;
  const primaryLabel = {
    verify: "Verify →",
    email: "Send Code →",
    otp: "Confirm & Update",
  }[stage];
  const primaryColor = stage === "otp" ? "emerald" : "indigo";

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change Email Address"
      subtitle="3-step verification to keep your account safe"
      maxW="max-w-md"
    >
      {/* ── Step indicator ── */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-0 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="flex items-center flex-1 last:flex-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold font-[DM_Sans] transition-all duration-300 flex-shrink-0
                  ${
                    i < stageIdx
                      ? "bg-indigo-600 text-white"
                      : i === stageIdx
                        ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1"
                        : "bg-slate-100 text-slate-400"
                  }`}
              >
                {i < stageIdx ? "✓" : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all duration-500
                    ${i < stageIdx ? "bg-indigo-500" : "bg-slate-100"}`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-[10.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] mb-4">
          Step {stageIdx + 1} — {STEPS[stageIdx].label}
        </p>
      </div>

      {/* ── Stage content ── */}
      <div className="px-6 pb-2">
        <AnimatePresence mode="wait">
          {/* ─ Step 0: password verify ─ */}
          {stage === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-amber-500 text-base flex-shrink-0">
                  ⚠
                </span>
                <p className="text-[11.5px] text-amber-700 font-[DM_Sans]">
                  Enter your <strong>current password</strong> to confirm it's
                  you before we allow any changes to your email address.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] mb-1">
                  Current Email
                </p>
                <p className="text-[13px] font-semibold text-slate-700 font-[DM_Sans] truncate">
                  {currentEmail}
                </p>
              </div>

              <PwInput
                label="Current Password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError("");
                }}
                error={error}
              />
            </motion.div>
          )}

          {/* ─ Step 1: new email ─ */}
          {stage === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-indigo-500 flex-shrink-0">🔐</span>
                <p className="text-[11.5px] text-indigo-700 font-[DM_Sans]">
                  A <strong>6-digit code</strong> will be sent to your new email
                  address. You must enter it to complete the change.
                </p>
              </div>

              <Input
                label="Current Email"
                value={currentEmail}
                onChange={() => {}}
                disabled
              />

              <Input
                label="New Email Address"
                value={newEmail}
                onChange={(v) => {
                  setNewEmail(v);
                  setError("");
                }}
                type="email"
                placeholder="your@newemail.com"
                error={error}
                hint="We'll send a verification code here"
                required
              />
            </motion.div>
          )}

          {/* ─ Step 2: OTP ─ */}
          {stage === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-[12px] text-emerald-700 font-[DM_Sans]">
                  Code sent to <strong>{newEmail}</strong>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans] mb-3">
                  Enter 6-digit code
                </p>
                <OtpBoxes
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    setError("");
                  }}
                />
                {error && (
                  <p className="text-[11px] text-red-500 font-[DM_Sans] mt-2">
                    {error}
                  </p>
                )}
              </div>

              {/* Resend + change email links */}
              <div className="flex items-center gap-4 flex-wrap">
                {countdown > 0 ? (
                  <span className="text-[11px] text-slate-400 font-[DM_Sans]">
                    Resend in <strong>{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setOtp("");
                      setError("");
                      handleSendOtp();
                    }}
                    className="text-[11px] text-indigo-600 font-semibold font-[DM_Sans] hover:underline"
                  >
                    Resend code
                  </button>
                )}
                <button
                  onClick={() => {
                    setStage("email");
                    setOtp("");
                    setError("");
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-[DM_Sans]"
                >
                  Change email
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-4">
        {/* Back button — only shown on step 1 and 2 */}
        {stageIdx > 0 ? (
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => {
              setError("");
              setStage(STEPS[stageIdx - 1].key);
            }}
          >
            ← Back
          </Btn>
        ) : (
          <Btn variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Btn>
        )}

        <Btn
          onClick={handlePrimary}
          loading={primaryLoading}
          disabled={primaryDisabled}
          color={primaryColor}
        >
          {primaryLabel}
        </Btn>
      </div>
    </Modal>
  );
}

/* ─── Read field pair ─────────────────────────────────────────────────────── */
function InfoGrid({ items, columns = 2 }) {
  return (
    <div
      className={`grid grid-cols-1 ${columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : ""} gap-x-6 gap-y-5`}
    >
      {items.map(({ label, value, mono, badge, full, icon }) => (
        <div
          key={label}
          className={
            full ? `col-span-2 ${columns === 3 ? "sm:col-span-3" : ""}` : ""
          }
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {icon && <span className="text-slate-400">{icon}</span>}
              <span className="text-[8px] md:text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
                {label}
              </span>
            </div>
            {badge || (
              <span
                className={`text-[11px] md:text-[13.5px] font-semibold text-slate-700 ${mono ? "font-mono" : "font-[DM_Sans]"}`}
              >
                {value || "—"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { toasts, push } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  // Add this state at the top of your component
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const fileRef = useRef(null);

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  /* ── Fetch ── */
  useEffect(() => {
    axios
      .get(`${API}/profile`, { withCredentials: true })
      .then((res) => {
        if (res.data.success) {
          setProfile(res.data.data);
          setAvatarUrl(res.data.data.avatarUrl || null);
        }
      })
      .catch(() => push("Failed to load profile", "error"))
      .finally(() => setLoading(false));
  }, []);
  // Add this effect in your component
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const close = () => setAvatarMenuOpen(false);
    document.addEventListener("touchstart", close);
    return () => document.removeEventListener("touchstart", close);
  }, [avatarMenuOpen]);
  /* ── Avatar upload ── */
  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      push("Max file size is 2MB", "error");
      return;
    }
    setAvatarUrl(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await axios.post(`${API}/profile/avatar`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarUrl(res.data.data.avatarUrl);
      push("Profile photo updated");
    } catch {
      push("Upload failed", "error");
      setAvatarUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  /* ── Avatar removal ── */
  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return; // nothing to remove
    setAvatarRemoving(true);
    try {
      await axios.delete(`${API}/profile/avatar`, { withCredentials: true });
      setAvatarUrl(null);
      push("Profile photo removed");
    } catch {
      push("Failed to remove photo", "error");
    } finally {
      setAvatarRemoving(false);
    }
  };

  /* ── Loading ── */
  if (loading) return <Loading />;
  if (!profile) return null;

  const tenureStr = tenure(profile.dateOfJoining);

  const fullAddress = [
    profile.address,
    profile.city,
    profile.state,
    profile.pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}
      `}</style>

      <div className="max-w-4xl mx-auto px-3 sm:px-0">
        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-slate-100 rounded-2xl overflow-hidden mb-5 shadow-sm"
        >
          {/* Banner */}
          <div
            className="h-24 sm:h-32 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(120deg,#0f172a 0%,#1e3a5f 48%,#1a2540 100%)",
            }}
          >
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white/[0.03]"
                style={{
                  width: 110 + i * 45,
                  height: 110 + i * 45,
                  top: "50%",
                  left: `${8 + i * 13}%`,
                  transform: "translate(-50%,-50%)",
                }}
              />
            ))}
          </div>

          {/* Avatar + identity row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 px-4 sm:px-6 pb-5 sm:pb-6">
            {/* Avatar */}
            <div className="relative -mt-10 sm:-mt-12 flex-shrink-0 group/avatar">
              {/* Main circle */}
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[4px] border-white shadow-xl overflow-hidden relative cursor-pointer"
                style={{ background: avatarGrad(profile.name) }}
                onClick={() => {
                  // On desktop, clicking avatar directly opens file picker if no menu needed
                  // On mobile, toggle the action menu
                  if (window.matchMedia("(hover: none)").matches) {
                    setAvatarMenuOpen((prev) => !prev);
                  }
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[24px] sm:text-[30px] font-black text-white font-[DM_Sans] flex items-center justify-center w-full h-full">
                    {initials(profile.name)}
                  </span>
                )}

                {/* Spinner overlay while uploading / removing */}
                {(avatarUploading || avatarRemoving) && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Action buttons — hover on desktop, tap-toggle on mobile */}
              {!avatarUploading && !avatarRemoving && (
                <div
                  className={`absolute inset-0 transition-opacity duration-150 flex items-center justify-center gap-1.5
        ${
          avatarMenuOpen
            ? "opacity-100" // mobile: toggled open
            : "opacity-0 group-hover/avatar:opacity-100" // desktop: hover
        }`}
                >
                  {/* Upload / change button */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.stopPropagation(); // prevent toggling menu closed immediately
                      fileRef.current?.click();
                      setAvatarMenuOpen(false);
                    }}
                    title={avatarUrl ? "Change photo" : "Upload photo"}
                    className="w-7 h-7 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-indigo-600/90 transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </motion.button>

                  {/* Remove button */}
                  {avatarUrl && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAvatar();
                        setAvatarMenuOpen(false);
                      }}
                      title="Remove photo"
                      className="w-7 h-7 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-red-500/90 transition-colors"
                    >
                      <svg
                        width="11"
                        height="11"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </motion.button>
                  )}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatar}
                className="hidden"
              />
            </div>
            {/* Name + role + stats */}
            <div className="flex-1 min-w-0 pt-0 sm:pt-1">
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h2
                      className="text-[18px] sm:text-[22px] font-black text-slate-900 tracking-tight m-0"
                      style={{ fontFamily: "Georgia,serif" }}
                    >
                      {profile.name}
                    </h2>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold font-[DM_Sans] border
                      ${profile.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                    >
                      {profile.isActive ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-600 font-[DM_Sans] font-semibold">
                    {profile.designation}
                  </p>
                  {profile.department?.name && (
                    <p className="text-[12px] text-slate-400 font-[DM_Sans] mt-0.5">
                      {profile.department.name}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5 px-2 py-0.5 rounded w-full">
                    <p>ID: {profile.empId}</p>
                    {tenureStr && <p>Tenure: {tenureStr}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Single column sections ── */}
        <div className="space-y-5">
          {/* Personal info */}
          <Card
            title="Personal Information"
            delay={0.08}
            accent="#6366f1"
            icon={
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#6366f1"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            action={
              <Btn size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Btn>
            }
          >
            <div className="space-y-6">
              <InfoGrid
                columns={3}
                items={[
                  {
                    label: "Full Name",
                    value: profile.name,
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ),
                  },
                  {
                    label: "Date of Birth",
                    value: profile.dob ? fmtDate(profile.dob) : "—",
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    ),
                  },
                  {
                    label: "Gender",
                    value: profile.gender
                      ? { MALE: "Male", FEMALE: "Female", OTHER: "Other" }[
                          profile.gender
                        ] || profile.gender
                      : "—",
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ),
                  },
                  {
                    label: "Mobile Number",
                    value: profile.mobileNumber || "—",
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                      </svg>
                    ),
                  },
                ]}
              />

              {fullAddress && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-150 to-transparent" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="text-[8px] md:text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
                        Address
                      </span>
                    </div>
                    <p className="text-[11px] md:text-[13.5px] font-medium text-slate-700 font-[DM_Sans] leading-relaxed">
                      {fullAddress}
                    </p>
                  </div>
                </>
              )}

              {profile.emergencyContactName && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-150 to-transparent" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#ef4444"
                        strokeWidth="2"
                      >
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                      </svg>
                      <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-red-400 font-[DM_Sans]">
                        Emergency Contact
                      </span>
                    </div>
                    <InfoGrid
                      columns={3}
                      items={[
                        { label: "Name", value: profile.emergencyContactName },
                        {
                          label: "Relation",
                          value: profile.emergencyContactRelation || "—",
                        },
                        {
                          label: "Phone",
                          value: profile.emergencyContactPhone || "—",
                        },
                      ]}
                    />
                  </div>
                </>
              )}

              {!profile.mobileNumber && !profile.gender && !profile.dob && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-[12px] text-slate-400 font-[DM_Sans] hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all"
                >
                  + Add personal details, address & emergency contact
                </button>
              )}
            </div>
          </Card>

          {/* Employment */}
          <Card
            title="Employment Details"
            delay={0.12}
            accent="#0891b2"
            icon={
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#0891b2"
                strokeWidth="2"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              </svg>
            }
          >
            <div className="space-y-6">
              <InfoGrid
                columns={2}
                items={[
                  {
                    label: "Employee ID",
                    value: profile.empId,
                    mono: true,
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M8 2v4M16 2v4" />
                      </svg>
                    ),
                  },
                  {
                    label: "Date of Joining",
                    value: fmtDate(profile.dateOfJoining),
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    ),
                  },
                  {
                    label: "Department",
                    value: profile.department?.name || "—",
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    ),
                  },
                  {
                    label: "Designation",
                    value: profile.designation || "—",
                    icon: (
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ),
                  },
                ]}
              />

              <div className="h-px bg-gradient-to-r from-transparent via-slate-150 to-transparent" />

              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={profile.isActive ? "#10b981" : "#ef4444"}
                      strokeWidth="2"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
                      Employment Status
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-bold font-[DM_Sans] border
                    ${profile.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${profile.isActive ? "bg-emerald-500" : "bg-red-400"}`}
                    />
                    {profile.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={
                        profile.isBiometricRegistered ? "#10b981" : "#f59e0b"
                      }
                      strokeWidth="2"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
                      Biometric Status
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-bold font-[DM_Sans] border
                    ${profile.isBiometricRegistered ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                  >
                    {profile.isBiometricRegistered ? "✓" : "○"}
                    {profile.isBiometricRegistered ? "Registered" : "Pending"}
                  </span>
                </div>
              </div> */}
            </div>
          </Card>

          {/* Security */}
          <Card
            title="Account Security"
            delay={0.16}
            accent="#dc2626"
            icon={
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#dc2626"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          >
            <div className="space-y-4">
              {/* Email row */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans]">
                      Email
                    </span>
                  </div>
                  <p className="text-[10px] md:text-[12.5px] font-semibold text-slate-700 font-[DM_Sans] truncate">
                    {profile.email}
                  </p>
                </div>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => setEmailOpen(true)}
                >
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Change
                </Btn>
              </div>

              {/* Password row */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-50/30 border border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span className="text-[8px] md:text-[10px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans]">
                      Password
                    </span>
                  </div>
                  <p className="text-[10px] md:text-[12.5px] font-semibold text-slate-400 font-[DM_Sans] tracking-[0.25em]">
                    ••••••••
                  </p>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => setPwOpen(true)}>
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Change
                </Btn>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-150 to-transparent" />

              {/* Security checklist */}
              {/* <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#10b981"
                    strokeWidth="2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 font-[DM_Sans]">
                    Security Features
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
                  {[
                    { ok: true, text: "Strong password policy enforced" },
                    { ok: true, text: "Email protected with OTP verification" },
                    {
                      ok: profile.isBiometricRegistered,
                      text: "Biometric authentication registered",
                    },
                  ].map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-sm
                        ${t.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {t.ok ? "✓" : "○"}
                      </span>
                      <span
                        className={`text-[12px] font-[DM_Sans] font-medium ${t.ok ? "text-slate-700" : "text-amber-600"}`}
                      >
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <EditPersonalModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={(payload) =>
          setProfile((p) => ({
            ...p,
            mobileNumber: payload.mobileNumber,
            gender: payload.gender,
            dob: payload.dob,
            emergencyContactName: payload.emergencyContactName,
            emergencyContactPhone: payload.emergencyContactPhone,
            emergencyContactRelation: payload.emergencyContactRelation,
            address: payload.address,
            city: payload.city,
            state: payload.state,
            pinCode: payload.pinCode,
          }))
        }
        push={push}
      />

      <ChangePasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        push={push}
      />

      <ChangeEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        currentEmail={profile.email}
        onSaved={(email) => setProfile((p) => ({ ...p, email }))}
        push={push}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
