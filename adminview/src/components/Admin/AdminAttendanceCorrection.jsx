import React, { useState, useEffect } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Toast, useToast } from "../shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom"; // ✅ Imported to read the URL parameter
import {
  Clock,
  Search,
  Filter,
  AlertCircle,
  Check,
  X,
  Edit2,
  Loader2,
} from "lucide-react";

export function AdminAttendanceCorrection() {
  const { toast, showToast, hideToast } = useToast();

  // ✅ Read URL parameters
  const [searchParams] = useSearchParams();

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Default to 'corrections' if the URL says ?filter=corrections, otherwise 'all'
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    punchOutTime: "17:00", // Default to 5 PM
    reason: "",
  });

  const API_URL = "http://localhost:5000/api/admin/attendance";

  // Fetch REAL Attendance Data
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_URL);
      setRecords(response.data);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch attendance records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Update filter state if the URL changes while already on the page
  useEffect(() => {
    const urlFilter = searchParams.get("filter");
    if (urlFilter) {
      setFilter(urlFilter);
    }
  }, [searchParams]);

  // Submit the Correction to the Backend
  const handleSaveCorrection = async () => {
    if (!correctionForm.punchOutTime || !correctionForm.reason) {
      showToast("Please provide both a time and a reason.", "error");
      return;
    }

    try {
      // ✅ Real API Call to your Express Backend
      const response = await axios.put(
        `${API_URL}/${editingRecord.id}/correct`,
        {
          punchOutTime: correctionForm.punchOutTime,
          reason: correctionForm.reason,
        },
      );

      // Update the specific record in the UI
      setRecords(
        records.map((rec) =>
          rec.id === editingRecord.id ? response.data : rec,
        ),
      );

      showToast(
        `Timesheet corrected for ${editingRecord.user.name}`,
        "success",
      );
      setEditingRecord(null); // Close modal
      setCorrectionForm({ punchOutTime: "17:00", reason: "" }); // Reset form
    } catch (error) {
      showToast("Failed to save correction", "error");
    }
  };

  // Filter records based on tabs and search
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.user.empId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      filter === "all" ||
      (filter === "corrections" && rec.status === "MISSED_PUNCH");
    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <AdminLayout
        title="Attendance & Timesheets"
        description="Loading daily logs..."
      >
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Attendance & Timesheets"
      description="Review daily logs and correct missed biometric punches."
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter("corrections")}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                filter === "corrections"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Needs Correction
              {records.filter((r) => r.status === "MISSED_PUNCH").length >
                0 && (
                <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                  {records.filter((r) => r.status === "MISSED_PUNCH").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                filter === "all"
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Records
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Employee
                </th>
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Date
                </th>
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Punch In
                </th>
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Punch Out
                </th>
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Status
                </th>
                <th className="p-4 font-medium text-xs uppercase tracking-widest text-gray-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-sm text-gray-500"
                  >
                    No attendance records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-medium text-sm">{rec.user.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {rec.user.empId}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-mono">
                      {rec.punchIn
                        ? new Date(rec.punchIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="p-4 text-sm font-mono">
                      {rec.punchOut ? (
                        new Date(rec.punchOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-red-400 font-sans italic text-xs">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {rec.status === "MISSED_PUNCH" ? (
                        <Badge
                          variant="error"
                          className="flex items-center gap-1 w-max"
                        >
                          <AlertCircle className="w-3 h-3" /> Missed Punch
                        </Badge>
                      ) : rec.status === "PRESENT" ? (
                        <Badge variant="success">Present</Badge>
                      ) : (
                        <Badge variant="default">{rec.status}</Badge>
                      )}
                      {rec.isManualEntry && (
                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                          Manual Override
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {rec.status === "MISSED_PUNCH" ? (
                        <button
                          onClick={() => setEditingRecord(rec)}
                          className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-sm hover:opacity-90 transition-opacity flex items-center gap-2 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" /> Fix Punch
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Modal */}
      <AnimatePresence>
        {editingRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRecord(null)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
            >
              <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md pointer-events-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-serif font-medium flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Timesheet Correction
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Fixing missing punch out for{" "}
                      <span className="font-medium text-black">
                        {editingRecord.user.name}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-sm border border-gray-200 flex justify-between text-sm">
                    <span className="text-gray-500">Recorded Punch In:</span>
                    <span className="font-mono font-medium">
                      {new Date(editingRecord.punchIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                      Confirmed Punch Out Time
                    </label>
                    <input
                      type="time"
                      value={correctionForm.punchOutTime}
                      onChange={(e) =>
                        setCorrectionForm({
                          ...correctionForm,
                          punchOutTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-black focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                      Reason / Audit Note
                    </label>
                    <textarea
                      placeholder="e.g., Professor forgot to scan face at exit, confirmed left campus at 5:00 PM."
                      value={correctionForm.reason}
                      onChange={(e) =>
                        setCorrectionForm({
                          ...correctionForm,
                          reason: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-black focus:outline-none min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCorrection}
                    className="px-6 py-2 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Save Correction
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
