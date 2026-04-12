import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import Loading from "../components/Loading";
import RequestHistory from "../components/RequestHistory";
import Toast from "../components/Toast";
import BalanceCard from "../components/BalanceCard";
import ApplyLeaveForm from "../components/ApplyLeaveForm";

import Icon from "../components/ui/icons/Icon";
import { Icons } from "../components/ui/icons/iconPaths";

import { useIsMobile } from "../hooks/useIsMobile";

import { PORT } from "../constants/port";

const API = `http://localhost:${PORT}/api/employee`;

const ACCENTS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

export default function EmployeeLeavePage({
  defaultApply = false,
  onApplyClose,
}) {
  const isMobile = useIsMobile();

  const [data, setData] = useState({
    balances: [],
    leaveTypes: [],
    requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);

  const toast$ = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leave`, { withCredentials: true });
      setData(res.data);
    } catch {
      toast$("Failed to load leave data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (defaultApply) setModalOpen(true);
  }, [defaultApply]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  // console.log(data);

  const closeModal = () => {
    setModalOpen(false);
    setSubmitError("");
    onApplyClose?.();
  };

  const handleSubmit = async (form) => {
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const res = await axios.post(`${API}/leave`, form, {
        withCredentials: true,
      });
      setData((prev) => ({ ...prev, requests: [res.data, ...prev.requests] }));
      toast$("Leave request submitted!");
      fetchData();
      closeModal();
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to submit request");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setCancelLoading(id);
    try {
      await axios.delete(`${API}/leave/${id}`, { withCredentials: true });
      setData((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === id ? { ...r, status: "CANCELLED" } : r,
        ),
      }));
      toast$("Leave request cancelled");
    } catch (err) {
      toast$(err.response?.data?.error || "Failed to cancel", "error");
    } finally {
      setCancelLoading(null);
    }
  };

  const pending = data.requests.filter((r) => r.status === "PENDING").length;
  const approved = data.requests.filter((r) => r.status === "APPROVED").length;
  const totalUsed = data.balances.reduce((s, b) => s + b.used, 0);

  if (loading) return <Loading />;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] md:text-[24px] font-bold text-slate-900 font-serif">
              My Leaves
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pending > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-[5px] rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pending} pending
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-[5px] rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {approved} approved
            </span>

            <motion.button
              whileHover={{
                scale: 1.03,
                boxShadow: "0 8px 24px rgba(99,102,241,0.30)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-[7px] rounded-full text-[12.5px] font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm"
            >
              <Icon d={Icons.plus} size={13} />
              Apply Leave
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        {[
          {
            label: "Total Requests",
            value: data.requests.length,
            icon: Icons.leave,
            color: "#6366f1",
            bg: "#eef2ff",
          },
          {
            label: "Days Used",
            value: totalUsed,
            icon: Icons.calendar,
            color: "#f59e0b",
            bg: "#fffbeb",
          },
          {
            label: "Approved",
            value: approved,
            icon: Icons.check,
            color: "#10b981",
            bg: "#f0fdf4",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-1 md:gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: stat.bg }}
            >
              <Icon d={stat.icon} size={16} color={stat.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 leading-none">
                {stat.value}
              </p>
              <p className="text-[10.5px] text-slate-400 mt-0.5">
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <p className="text-[10.5px] font-semibold text-slate-400 tracking-[0.1em] uppercase mb-2.5">
          Leave Balances
        </p>
        <div
          className={`gap-3 ${
            isMobile
              ? "flex overflow-x-auto pb-1 scrollbar-none"
              : "grid grid-cols-[repeat(auto-fill,minmax(185px,1fr))]"
          }`}
        >
          {data.balances.map((b, i) => (
            <div
              key={b.leaveTypeId}
              className={isMobile ? "min-w-[185px]" : ""}
            >
              <BalanceCard
                {...b}
                accent={ACCENTS[i % ACCENTS.length]}
                index={i}
              />
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <RequestHistory
          requests={data.requests}
          onCancel={handleCancel}
          cancelLoading={cancelLoading}
        />
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? "16px" : "24px",
            }}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 480,
                maxHeight: "90vh",
                overflowY: "auto",
                borderRadius: 20,
                boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
              }}
            >
              <ApplyLeaveForm
                leaveTypes={data.leaveTypes}
                balances={data.balances}
                onSubmit={handleSubmit}
                submitLoading={submitLoading}
                submitError={submitError}
                onBack={closeModal}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast toast={toast} />
    </>
  );
}
