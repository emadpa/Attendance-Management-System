import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { PORT } from "../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function genTempId() {
  return `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const EMPTY_TASK = () => ({
  _tempId: genTempId(), // local only, never sent to API
  time: "",
  title: "",
  duration: "",
  description: "",
});

/* ─────────────────────────────────────────────
   Inline SVG icons (no extra dep)
───────────────────────────────────────────── */
const Icon = {
  close: (
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
  ),
  plus: (
    <svg
      width="13"
      height="13"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (
    <svg
      width="13"
      height="13"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg
      width="13"
      height="13"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  clock: (
    <svg
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  chevDown: (
    <svg
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  check: (
    <svg
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   Single Task Row — view + inline edit
───────────────────────────────────────────── */
function TaskRow({
  task,
  isNew,
  accentColor,
  onUpdate,
  onDelete,
  onSaveNew,
  onCancelNew,
  saving,
  deleting,
}) {
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState({ ...task });
  const [err, setErr] = useState("");

  const setDraftField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setErr("Title is required.");
      return;
    }
    setErr("");
    if (isNew) {
      await onSaveNew(draft);
    } else {
      await onUpdate(task.id, draft);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      onCancelNew();
      return;
    }
    setDraft({ ...task });
    setEditing(false);
    setErr("");
  };

  /* ── View mode ── */
  if (!editing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="group relative flex items-start gap-3 rounded-[14px] px-4 py-3 border transition-all"
        style={{
          background: `${accentColor}07`,
          borderColor: `${accentColor}22`,
        }}
      >
        {/* Accent bar */}
        <div
          className="absolute left-0 top-[10%] h-[80%] w-[3px] rounded-r-full"
          style={{ background: accentColor }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 pl-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-800 font-[DM_Sans]">
              {task.title}
            </span>
            {task.time && (
              <span
                className="flex items-center gap-[3px] text-[10px] font-semibold px-[7px] py-[2px] rounded-full"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {Icon.clock} {fmtTime(task.time)}
              </span>
            )}
            {task.duration && (
              <span className="text-[10px] text-slate-400 font-[DM_Sans]">
                {task.duration}m
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-[11.5px] text-slate-400 mt-[3px] font-[DM_Sans] line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            {Icon.edit}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            disabled={deleting}
            className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
          >
            {deleting ? (
              <span className="w-[10px] h-[10px] rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            ) : (
              Icon.trash
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Edit / New mode ── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[14px] border-2 overflow-hidden"
      style={{ borderColor: accentColor }}
    >
      {/* Edit header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `${accentColor}12` }}
      >
        <span
          className="text-[10.5px] font-bold tracking-widest uppercase font-[DM_Sans]"
          style={{ color: accentColor }}
        >
          {isNew ? "New Task" : "Edit Task"}
        </span>
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          {Icon.close}
        </button>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 flex flex-col gap-3 bg-white">
        {/* Title */}
        <div>
          <label className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] block mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            autoFocus
            placeholder="e.g. Team standup"
            value={draft.title}
            onChange={(e) => setDraftField("title", e.target.value)}
            className="w-full h-[38px] rounded-[10px] border border-slate-200 px-3 text-[13px] text-slate-700 font-[DM_Sans] focus:outline-none focus:ring-2 transition"
            style={{ "--tw-ring-color": `${accentColor}40` }}
            onFocus={(e) => (e.target.style.borderColor = accentColor)}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Time + Duration row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] block mb-1">
              Time
            </label>
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraftField("time", e.target.value)}
              className="w-full h-[38px] rounded-[10px] border border-slate-200 px-3 text-[12.5px] text-slate-700 font-[DM_Sans] focus:outline-none transition"
              onFocus={(e) => (e.target.style.borderColor = accentColor)}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
          <div>
            <label className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] block mb-1">
              Duration (mins)
            </label>
            <input
              type="number"
              min="1"
              max="480"
              placeholder="30"
              value={draft.duration}
              onChange={(e) =>
                setDraftField(
                  "duration",
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              className="w-full h-[38px] rounded-[10px] border border-slate-200 px-3 text-[12.5px] text-slate-700 font-[DM_Sans] focus:outline-none transition"
              onFocus={(e) => (e.target.style.borderColor = accentColor)}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[9.5px] font-bold tracking-widest uppercase text-slate-400 font-[DM_Sans] block mb-1">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Optional notes…"
            value={draft.description}
            onChange={(e) => setDraftField("description", e.target.value)}
            className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[12.5px] text-slate-700 font-[DM_Sans] focus:outline-none resize-none transition"
            onFocus={(e) => (e.target.style.borderColor = accentColor)}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Error */}
        {err && (
          <p className="text-[11px] text-red-500 font-[DM_Sans] flex items-center gap-1">
            <span>⚠</span> {err}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="flex-1 h-[36px] rounded-[10px] border border-slate-200 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition font-[DM_Sans]"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] h-[36px] rounded-[10px] text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition font-[DM_Sans]"
            style={{ background: saving ? `${accentColor}80` : accentColor }}
          >
            {saving ? (
              <span className="w-[14px] h-[14px] rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                {Icon.check} {isNew ? "Add Task" : "Save Changes"}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Delete confirm dialog (inline)
───────────────────────────────────────────── */
function DeleteConfirm({ taskTitle, onConfirm, onCancel, deleting }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 flex flex-col gap-3"
    >
      <p className="text-[12.5px] text-slate-700 font-[DM_Sans]">
        Delete <span className="font-bold text-slate-900">"{taskTitle}"</span>?
        This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 h-[34px] rounded-[9px] border border-slate-200 text-[11.5px] font-semibold text-slate-500 hover:bg-white transition font-[DM_Sans]"
        >
          Keep it
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onConfirm}
          disabled={deleting}
          className="flex-[1.5] h-[34px] rounded-[9px] text-[11.5px] font-bold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-1.5 transition font-[DM_Sans] disabled:opacity-60"
        >
          {deleting ? (
            <span className="w-[12px] h-[12px] rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>{Icon.trash} Delete</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main ScheduleModal
───────────────────────────────────────────── */
export default function ScheduleModal({
  initialDate,
  initialData,
  onClose,
  onSaved,
}) {
  /*
    initialDate : "YYYY-MM-DD"
    initialData : day's schedule record from API (may be null = no schedule yet)
  */

  const accentColor = "#6366f1";

  /* Live task list — start from existing tasks or empty */
  const [tasks, setTasks] = useState(() =>
    Array.isArray(initialData?.tasks) ? initialData.tasks : [],
  );

  /* State for new-task draft (only one new task open at a time) */
  const [addingNew, setAddingNew] = useState(false);

  /* Per-task operation state */
  const [savingId, setSavingId] = useState(null); // taskId being updated
  const [deletingId, setDeletingId] = useState(null); // taskId pending delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // taskId showing confirm

  /* Global error */
  const [globalErr, setGlobalErr] = useState("");

  const displayDate = new Date(initialDate + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const hasSchedule = !!initialData?.id;

  /* ── Add new task (POST) ── */
  const handleSaveNew = useCallback(
    async (draft) => {
      setSavingId("new");
      setGlobalErr("");
      try {
        const payload = {
          date: initialDate,
          tasks: [
            {
              time: draft.time || null,
              title: draft.title.trim(),
              duration: draft.duration ? Number(draft.duration) : null,
              description: draft.description || null,
            },
          ],
        };
        const res = await axios.post(`${API}/schedule`, payload, {
          withCredentials: true,
        });
        if (res.data.success) {
          setTasks(res.data.data.tasks || []);
          setAddingNew(false);
          onSaved?.();
        }
      } catch (e) {
        setGlobalErr(e?.response?.data?.message || "Failed to add task.");
      } finally {
        setSavingId(null);
      }
    },
    [initialDate, onSaved],
  );

  /* ── Update existing task (PATCH) ── */
  const handleUpdate = useCallback(
    async (taskId, draft) => {
      setSavingId(taskId);
      setGlobalErr("");
      try {
        const payload = {
          time: draft.time || null,
          title: draft.title.trim(),
          duration: draft.duration ? Number(draft.duration) : null,
          description: draft.description || null,
        };
        const res = await axios.patch(
          `${API}/schedule/${initialDate}/task/${taskId}`,
          payload,
          { withCredentials: true },
        );
        if (res.data.success) {
          setTasks(res.data.data.tasks || []);
          onSaved?.();
        }
      } catch (e) {
        setGlobalErr(e?.response?.data?.message || "Failed to update task.");
      } finally {
        setSavingId(null);
      }
    },
    [initialDate, onSaved],
  );

  /* ── Delete task (DELETE) ── */
  const handleDelete = useCallback(
    async (taskId) => {
      setDeletingId(taskId);
      setGlobalErr("");
      try {
        const res = await axios.delete(
          `${API}/schedule/${initialDate}/task/${taskId}`,
          { withCredentials: true },
        );
        if (res.data.success) {
          /* If schedule was deleted (last task), tasks become empty */
          setTasks(res.data.data?.tasks || []);
          setConfirmDeleteId(null);
          onSaved?.();
        }
      } catch (e) {
        setGlobalErr(e?.response?.data?.message || "Failed to delete task.");
      } finally {
        setDeletingId(null);
      }
    },
    [initialDate, onSaved],
  );

  const taskCount = tasks.length + (addingNew ? 1 : 0);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-[4px]"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[210] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[min(500px,calc(100vw-24px))] max-h-[88vh] flex flex-col
                   bg-white rounded-[24px] shadow-2xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center"
                style={{ background: `${accentColor}18` }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={accentColor}
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h2 className="text-[15px] font-bold text-slate-900 font-[DM_Sans] leading-none">
                {hasSchedule ? "Manage Tasks" : "Add Schedule"}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-[DM_Sans]">
              {displayDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Task count badge */}
            {tasks.length > 0 && (
              <span
                className="px-[9px] py-[3px] rounded-full text-[10.5px] font-bold font-[DM_Sans]"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
            >
              {Icon.close}
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
          {/* Empty state */}
          {tasks.length === 0 && !addingNew && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <div
                className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-[24px]"
                style={{ background: `${accentColor}10` }}
              >
                📋
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-600 font-[DM_Sans]">
                  No tasks yet
                </p>
                <p className="text-[11.5px] text-slate-400 font-[DM_Sans] mt-1">
                  Add your first task for this day
                </p>
              </div>
            </motion.div>
          )}

          {/* Existing tasks */}
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <div key={task.id}>
                {/* Delete confirm overlay for this task */}
                <AnimatePresence>
                  {confirmDeleteId === task.id ? (
                    <DeleteConfirm
                      taskTitle={task.title}
                      deleting={deletingId === task.id}
                      onConfirm={() => handleDelete(task.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                    />
                  ) : (
                    <TaskRow
                      task={task}
                      isNew={false}
                      accentColor={accentColor}
                      saving={savingId === task.id}
                      deleting={deletingId === task.id}
                      onUpdate={handleUpdate}
                      onDelete={(id) => setConfirmDeleteId(id)}
                      onSaveNew={null}
                      onCancelNew={null}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </AnimatePresence>

          {/* New task form */}
          <AnimatePresence>
            {addingNew && (
              <TaskRow
                key="new-task"
                task={EMPTY_TASK()}
                isNew
                accentColor={accentColor}
                saving={savingId === "new"}
                deleting={false}
                onUpdate={null}
                onDelete={null}
                onSaveNew={handleSaveNew}
                onCancelNew={() => setAddingNew(false)}
              />
            )}
          </AnimatePresence>

          {/* Global error */}
          <AnimatePresence>
            {globalErr && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-[10px] px-3 py-2.5"
              >
                <span className="text-red-400 text-[13px]">⚠</span>
                <p className="text-[11.5px] text-red-500 font-[DM_Sans]">
                  {globalErr}
                </p>
                <button
                  onClick={() => setGlobalErr("")}
                  className="ml-auto text-red-300 hover:text-red-500 transition"
                >
                  {Icon.close}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-3 rounded-b-[24px]">
          <button
            onClick={onClose}
            className="h-[40px] px-5 rounded-[12px] border border-slate-200 text-[12.5px] font-semibold text-slate-500 hover:bg-white transition font-[DM_Sans]"
          >
            Close
          </button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setAddingNew(true);
              setGlobalErr("");
            }}
            disabled={addingNew}
            className="flex items-center gap-2 h-[40px] px-5 rounded-[12px] text-[12.5px] font-bold text-white transition font-[DM_Sans] disabled:opacity-50"
            style={{
              background: addingNew
                ? `${accentColor}60`
                : `linear-gradient(135deg, ${accentColor}, #8b5cf6)`,
              boxShadow: addingNew ? "none" : `0 4px 12px ${accentColor}40`,
            }}
          >
            {Icon.plus}
            Add Task
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
