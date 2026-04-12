import React, { useState, useEffect } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Toast, useToast } from "../shared/Toast";
import { motion } from "framer-motion";
import { Plus, Trash2, Clock, Users, Loader2 } from "lucide-react";

export function AdminShifts() {
  const { toast, showToast, hideToast } = useToast();

  // Real Data State (Starts completely empty, no dummy data)
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "09:00", // Default UI suggestion
    endTime: "17:00", // Default UI suggestion
  });

  const API_URL = "http://localhost:8080/api/admin/shifts";

  // --- Fetch Shifts from Database ---
  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_URL);
      setShifts(response.data);
    } catch (error) {
      console.error("Fetch shifts error:", error);
      showToast("Failed to load shifts from database", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Run once when component mounts
  useEffect(() => {
    fetchShifts();
  }, []);

  // --- Add New Shift ---
  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!newShift.name.trim() || !newShift.startTime || !newShift.endTime) {
      showToast("Please fill out all fields", "error");
      return;
    }

    try {
      const response = await axios.post(API_URL, newShift);

      // Instantly add the new database record to the UI
      setShifts([...shifts, response.data]);

      // Reset and close
      setIsModalOpen(false);
      setNewShift({ name: "", startTime: "09:00", endTime: "17:00" });
      showToast("Shift created successfully", "success");
    } catch (error) {
      console.error("Add shift error:", error);
      showToast(
        error.response?.data?.error || "Failed to create shift",
        "error",
      );
    }
  };

  // --- Delete Shift ---
  const handleDeleteShift = async (id) => {
    if (window.confirm("Are you sure you want to delete this shift?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);

        // Remove from UI
        setShifts(shifts.filter((shift) => shift.id !== id));
        showToast("Shift deleted", "success");
      } catch (error) {
        console.error("Delete shift error:", error);
        // This catches the backend error if employees are still assigned to it!
        showToast(
          error.response?.data?.error || "Failed to delete shift",
          "error",
        );
      }
    }
  };

  // Helper to format 24h backend time (e.g., "14:00") to 12h UI time (e.g., "2:00 PM")
  const formatTime = (time24) => {
    if (!time24) return "--:--";
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <AdminLayout title="Shift Policies" description="Loading data...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Shift Policies"
      description="Define working hours and standard shifts for the organization."
      actions={
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Shift
        </button>
      }
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shifts.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-sm">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>
              No shifts configured yet. Create a standard working shift to get
              started.
            </p>
          </div>
        ) : (
          shifts.map((shift) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={shift.id}
              className="bg-white border border-gray-200 rounded-sm shadow-sm hover:border-gray-300 transition-colors group relative overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-serif font-medium text-gray-900">
                    {shift.name}
                  </h3>
                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 bg-gray-50 p-4 rounded-sm border border-gray-100 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                      Start
                    </div>
                    <div className="font-mono text-xl font-medium">
                      {formatTime(shift.startTime)}
                    </div>
                  </div>
                  <div className="text-gray-300">→</div>
                  <div className="flex-1 bg-gray-50 p-4 rounded-sm border border-gray-100 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                      End
                    </div>
                    <div className="font-mono text-xl font-medium">
                      {formatTime(shift.endTime)}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <Users className="w-4 h-4" />
                  {/* Prisma _count feature from the backend */}
                  <span>
                    {shift._count?.users || 0} Employee
                    {shift._count?.users !== 1 && "s"} Assigned
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* --- Add Shift Modal --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Shift"
      >
        <form onSubmit={handleAddShift} className="space-y-6">
          <Input
            label="Shift Name"
            value={newShift.name}
            onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
            required
            placeholder="e.g. Standard 9-to-5, Night Guard"
          />

          <div className="grid grid-cols-2 gap-4">
            {/* HTML time inputs automatically handle the standard "HH:mm" 24h format for the backend */}
            <Input
              label="Start Time"
              type="time"
              value={newShift.startTime}
              onChange={(e) =>
                setNewShift({ ...newShift, startTime: e.target.value })
              }
              required
            />
            <Input
              label="End Time"
              type="time"
              value={newShift.endTime}
              onChange={(e) =>
                setNewShift({ ...newShift, endTime: e.target.value })
              }
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              Create Shift
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
