import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";
import { Toast, useToast } from "../shared/Toast";
import { motion } from "framer-motion";
import { Send, Trash2, Loader2, Search } from "lucide-react";

export function AdminNotifications() {
  const { toast, showToast, hideToast } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingDraftId, setEditingDraftId] = useState(null);
  const [audience, setAudience] = useState("ALL");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const API_URL = "http://localhost:8080/api/admin/notifications";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_URL);
      setAnnouncements(response.data.notifications);
      setDrafts(response.data.drafts);
      setDepartments(response.data.departments);
      setEmployees(response.data.employees);
    } catch (error) {
      showToast("Failed to load notifications", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ✅ Updated filtering logic combining search term AND department filter
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(empSearchTerm.toLowerCase()) ||
      emp.empId.toLowerCase().includes(empSearchTerm.toLowerCase());

    const matchesDept = selectedDeptId
      ? emp.departmentId === selectedDeptId
      : true;

    return matchesSearch && matchesDept;
  });

  const handleSubmit = async (isDraftMode) => {
    const validationErrors = {};
    if (!title.trim()) validationErrors.title = "Title is required";
    if (!message.trim()) validationErrors.message = "Message is required";

    if (audience === "DEPARTMENT" && !selectedDeptId)
      showToast("Please select a department", "error");
    if (audience === "INDIVIDUAL" && !selectedEmpId)
      showToast("Please select an employee", "error");

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      let targetId = null;
      if (audience === "DEPARTMENT") targetId = selectedDeptId;
      if (audience === "INDIVIDUAL") targetId = selectedEmpId;

      const payload = {
        title,
        message,
        targetType: audience,
        targetId,
        isDraft: isDraftMode,
      };

      let response;
      if (editingDraftId) {
        response = await axios.put(`${API_URL}/${editingDraftId}`, payload);
      } else {
        response = await axios.post(API_URL, payload);
      }

      fetchNotifications();
      resetForm();
      showToast(
        isDraftMode
          ? "Draft saved to database"
          : "Notification sent successfully!",
        "success",
      );
    } catch (error) {
      showToast("Failed to save notification", "error");
    }
  };

  const loadDraft = (draft) => {
    setEditingDraftId(draft.id);
    setTitle(draft.title);
    setMessage(draft.message);
    setAudience(draft.targetType);
    setSelectedDeptId(draft.targetType === "DEPARTMENT" ? draft.targetId : "");
    setSelectedEmpId(draft.targetType === "INDIVIDUAL" ? draft.targetId : "");

    if (draft.targetType === "INDIVIDUAL") {
      const emp = employees.find((e) => e.id === draft.targetId);
      if (emp) setEmpSearchTerm(`${emp.name} (${emp.empId})`);
    }

    showToast("Draft loaded for editing", "success");
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure? This will remove the record completely.")
    ) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        setAnnouncements(announcements.filter((a) => a.id !== id));
        setDrafts(drafts.filter((d) => d.id !== id));
        if (editingDraftId === id) resetForm();
        showToast("Deleted successfully", "success");
      } catch (error) {
        showToast("Failed to delete", "error");
      }
    }
  };

  const resetForm = () => {
    setEditingDraftId(null);
    setTitle("");
    setMessage("");
    setAudience("ALL");
    setSelectedDeptId("");
    setSelectedEmpId("");
    setEmpSearchTerm("");
    setErrors({});
  };

  const getDeptName = (id) =>
    departments.find((d) => d.id === id)?.name || "Unknown Dept";
  const getEmpName = (id) =>
    employees.find((e) => e.id === id)?.name || "Unknown Employee";

  const getTargetLabel = (type, targetId) => {
    if (type === "ALL") return "All Employees";
    if (type === "DEPARTMENT") return getDeptName(targetId);
    if (type === "INDIVIDUAL") return getEmpName(targetId);
    return "Unknown";
  };

  if (isLoading) {
    return (
      <AdminLayout title="Notifications" description="Loading broadcasts...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Notifications"
      description="Broadcast company-wide announcements or message individuals directly."
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 h-full">
        {/* Compose Area */}
        <div className="bg-white border border-gray-200 rounded-sm p-6 sm:p-8 h-fit relative">
          {editingDraftId && (
            <div className="absolute top-0 left-0 w-full bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-medium text-amber-800 flex justify-between">
              <span>Editing Draft Mode</span>
              <button
                onClick={resetForm}
                className="hover:underline text-amber-900"
              >
                Cancel / Clear
              </button>
            </div>
          )}

          <h3
            className={`text-xl font-serif mb-6 ${editingDraftId ? "mt-6" : ""}`}
          >
            {editingDraftId ? "Edit Draft" : "New Message"}
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setAudience("ALL");
                    setSelectedDeptId("");
                    setSelectedEmpId("");
                  }}
                  className={`px-4 py-2 border rounded-sm text-sm transition-colors ${audience === "ALL" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  All Employees
                </button>
                <button
                  onClick={() => {
                    setAudience("DEPARTMENT");
                    setSelectedEmpId("");
                    setEmpSearchTerm("");
                  }}
                  className={`px-4 py-2 border rounded-sm text-sm transition-colors ${audience === "DEPARTMENT" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  Specific Department
                </button>
                <button
                  onClick={() => setAudience("INDIVIDUAL")}
                  className={`px-4 py-2 border rounded-sm text-sm transition-colors ${audience === "INDIVIDUAL" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  Single Employee
                </button>
              </div>
            </div>

            {/* ✅ Show Department Dropdown for BOTH 'DEPARTMENT' and 'INDIVIDUAL' modes */}
            {(audience === "DEPARTMENT" || audience === "INDIVIDUAL") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <Select
                  label={
                    audience === "INDIVIDUAL"
                      ? "Filter by Department (Optional)"
                      : "Select Department"
                  }
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setEmpSearchTerm(""); // Reset search when switching departments
                    setSelectedEmpId("");
                  }}
                >
                  <option value="">
                    {audience === "INDIVIDUAL"
                      ? "All Departments"
                      : "Choose a department..."}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </motion.div>
            )}

            {/* ✅ Show Search Box only for INDIVIDUAL mode */}
            {audience === "INDIVIDUAL" && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="relative"
              >
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Search Employee
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type name or Employee ID..."
                    value={empSearchTerm}
                    onChange={(e) => {
                      setEmpSearchTerm(e.target.value);
                      setIsEmpDropdownOpen(true);
                      setSelectedEmpId("");
                    }}
                    onFocus={() => setIsEmpDropdownOpen(true)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>

                {isEmpDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-md max-h-60 overflow-y-auto">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setEmpSearchTerm(`${emp.name} (${emp.empId})`);
                            setIsEmpDropdownOpen(false);
                          }}
                        >
                          <div className="font-medium text-gray-900">
                            {emp.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {emp.empId}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">
                        No employees found matching "{empSearchTerm}"{" "}
                        {selectedDeptId && "in this department"}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <Input
              label="Subject / Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              placeholder="e.g. Mandatory System Update"
              className="font-serif text-lg"
            />

            <Textarea
              label="Message Body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={errors.message}
              rows={6}
              placeholder="Write your message here..."
            />

            <div className="flex justify-end pt-4">
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleSubmit(true)}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-500 hover:text-black transition-colors"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="flex-1 sm:flex-none px-6 py-2 bg-black text-white text-sm uppercase tracking-wider rounded-sm hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Send className="w-3 h-3" />
                  {editingDraftId ? "Publish Draft" : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Database Drafts & History */}
        <div className="space-y-6">
          {/* DATABASE DRAFTS */}
          {drafts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">
                Saved Drafts
              </h3>
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-sm hover:shadow-md transition-shadow relative group"
                  >
                    <div
                      className="cursor-pointer pr-8"
                      onClick={() => loadDraft(draft)}
                    >
                      <h4 className="font-serif text-base mb-1">
                        {draft.title || "Untitled Draft"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Saved: {new Date(draft.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Delete Draft Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(draft.id);
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PUBLISHED HISTORY */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">
              Sent History
            </h3>
            <div className="space-y-4">
              {announcements.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No notifications sent yet.
                </p>
              )}

              {announcements.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 p-4 sm:p-6 rounded-sm hover:border-gray-300 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-serif text-base sm:text-lg">
                      {item.title}
                    </h4>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    Sent by Admin ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      <Badge
                        variant={
                          item.targetType === "INDIVIDUAL"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {getTargetLabel(item.targetType, item.targetId)}
                      </Badge>
                      <Badge variant="success" className="text-[10px]">
                        Sent
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
