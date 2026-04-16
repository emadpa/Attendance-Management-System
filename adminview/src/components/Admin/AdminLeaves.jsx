import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Toast, useToast } from "../shared/Toast";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit, Check, X, Loader2, Search } from "lucide-react";

export function AdminLeaves() {
  const { toast, showToast, hideToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [adHocLeaves, setAdHocLeaves] = useState([]);

  const [selectedType, setSelectedType] = useState(null);
  const [isAddLeaveTypeModalOpen, setIsAddLeaveTypeModalOpen] = useState(false);
  const [isAddAdHocModalOpen, setIsAddAdHocModalOpen] = useState(false);

  // Edit Modal States
  const [isEditLeaveTypeModalOpen, setIsEditLeaveTypeModalOpen] =
    useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState({
    id: "",
    name: "",
    defaultAllowed: 0,
    isPaid: "true",
  });

  const [errors, setErrors] = useState({});

  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ NEW: Status Tab State (Defaults to PENDING to keep the inbox clean)
  const [requestTab, setRequestTab] = useState("PENDING");

  const [newLeaveType, setNewLeaveType] = useState({
    name: "",
    defaultAllowed: 0,
    isPaid: "true",
  });

  const [newAdHocLeave, setNewAdHocLeave] = useState({
    userId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const API_URL = "http://localhost:8080/api/admin/leaves";

  // --- Click Outside Listener for Search Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [typesRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/types`),
        axios.get(`${API_URL}/requests`),
      ]);

      setLeaveTypes(typesRes.data);
      if (typesRes.data.length > 0) setSelectedType(typesRes.data[0].id);

      setLeaveRequests(requestsRes.data.inbox);
      setAdHocLeaves(requestsRes.data.adHoc);
      setEmployees(requestsRes.data.employees);
    } catch (error) {
      showToast("Failed to load leave data from database.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const currentLeaveType = leaveTypes.find((t) => t.id === selectedType);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(empSearchTerm.toLowerCase()) ||
      emp.empId.toLowerCase().includes(empSearchTerm.toLowerCase()),
  );

  // ✅ NEW: Filter leave requests based on the selected tab
  const filteredRequests = leaveRequests.filter((req) => {
    if (requestTab === "ALL") return true;
    return req.status === requestTab;
  });

  // --- Add Leave Type ---
  const handleAddLeaveType = async () => {
    if (!newLeaveType.name.trim())
      return setErrors({ name: "Name is required" });

    try {
      const payload = {
        ...newLeaveType,
        isPaid: newLeaveType.isPaid === "true",
      };

      const response = await axios.post(`${API_URL}/types`, payload);
      setLeaveTypes([...leaveTypes, response.data]);
      setIsAddLeaveTypeModalOpen(false);
      setNewLeaveType({ name: "", defaultAllowed: 0, isPaid: "true" });
      showToast("Leave type added successfully", "success");
    } catch (error) {
      showToast("Failed to create leave type", "error");
    }
  };

  // --- Edit Leave Type ---
  const handleEditLeaveType = async () => {
    if (!editingLeaveType.name.trim())
      return setErrors({ editName: "Name is required" });

    try {
      const payload = {
        ...editingLeaveType,
        isPaid: editingLeaveType.isPaid === "true",
      };

      const response = await axios.put(
        `${API_URL}/types/${editingLeaveType.id}`,
        payload,
      );

      setLeaveTypes(
        leaveTypes.map((type) =>
          type.id === editingLeaveType.id ? response.data : type,
        ),
      );

      setIsEditLeaveTypeModalOpen(false);
      showToast("Leave type updated successfully", "success");
    } catch (error) {
      showToast("Failed to update leave type", "error");
    }
  };

  // --- Delete Leave Type ---
  const handleDeleteLeaveType = async (id) => {
    if (window.confirm("Are you sure? This cannot be undone.")) {
      try {
        await axios.delete(`${API_URL}/types/${id}`);
        setLeaveTypes(leaveTypes.filter((lt) => lt.id !== id));
        if (selectedType === id) setSelectedType(leaveTypes[0]?.id || null);
        showToast("Leave type deleted", "success");
      } catch (error) {
        showToast("Failed to delete leave type", "error");
      }
    }
  };

  const handleRequestAction = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/requests/${id}/status`, {
        status: newStatus,
      });
      setLeaveRequests(
        leaveRequests.map((req) =>
          req.id === id ? { ...req, status: newStatus } : req,
        ),
      );
      showToast(
        `Leave request ${newStatus.toLowerCase()}!`,
        newStatus === "APPROVED" ? "success" : "error",
      );
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

  const handleAddAdHocLeave = async () => {
    const { userId, leaveTypeId, startDate, endDate, reason } = newAdHocLeave;
    if (!userId || !leaveTypeId || !startDate || !endDate || !reason) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/requests/ad-hoc`,
        newAdHocLeave,
      );
      setAdHocLeaves([response.data, ...adHocLeaves]);

      setIsAddAdHocModalOpen(false);
      setNewAdHocLeave({
        userId: "",
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      setEmpSearchTerm("");

      showToast("Ad-hoc leave created and approved", "success");
    } catch (error) {
      showToast("Failed to create ad-hoc leave", "error");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Leave Policies" description="Loading data...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Leave Policies"
      description="Define company-wide leave types, approve requests, and handle exceptions."
    >
      <Toast {...toast} onClose={hideToast} />

      {/* 1. Standard Leave Types Panel */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-12">
        <div className="w-full lg:w-1/3 space-y-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">
            Leave Types
          </h3>
          <div className="space-y-3">
            {leaveTypes.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full text-left p-4 sm:p-6 border rounded-sm transition-all duration-200 group ${selectedType === type.id ? "border-black bg-gray-50 ring-1 ring-black/5" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`font-serif font-medium text-base sm:text-lg ${selectedType === type.id ? "text-black" : "text-gray-700"}`}
                  >
                    {type.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  <span
                    className={
                      type.isPaid
                        ? "text-emerald-600 font-medium"
                        : "text-orange-500 font-medium"
                    }
                  >
                    {type.isPaid ? "Paid" : "Unpaid"}
                  </span>{" "}
                  · Quota:{" "}
                  {type.defaultAllowed > 0
                    ? `${type.defaultAllowed} days/yr`
                    : "No limit"}
                </div>
              </motion.button>
            ))}

            <button
              onClick={() => setIsAddLeaveTypeModalOpen(true)}
              className="w-full py-4 border border-dashed border-gray-300 rounded-sm text-gray-400 hover:text-black hover:border-black flex items-center justify-center gap-2 text-sm uppercase"
            >
              <Plus className="w-4 h-4" /> New Leave Type
            </button>
          </div>
        </div>

        <div className="w-full lg:w-2/3 bg-white border border-gray-200 rounded-sm p-6 sm:p-8 h-fit">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6">
            <h3 className="text-xl font-serif">
              View {currentLeaveType?.name}
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingLeaveType({
                    id: currentLeaveType?.id,
                    name: currentLeaveType?.name,
                    defaultAllowed: currentLeaveType?.defaultAllowed,
                    isPaid: currentLeaveType?.isPaid ? "true" : "false",
                  });
                  setIsEditLeaveTypeModalOpen(true);
                }}
                className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                title="Edit Leave Type"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteLeaveType(currentLeaveType?.id)}
                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                title="Delete Leave Type"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Leave Name"
              value={currentLeaveType?.name || ""}
              disabled
              className="font-serif text-lg"
            />
            <Input
              label="Yearly Quota (Days)"
              type="number"
              value={currentLeaveType?.defaultAllowed || 0}
              disabled
            />
            <Input
              label="Payment Category"
              value={currentLeaveType?.isPaid ? "Paid Leave" : "Unpaid Leave"}
              disabled
            />
          </div>
        </div>
      </div>

      {/* 2. Inbox */}
      <div className="border-t border-gray-200 pt-12 mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
          <h2 className="text-2xl font-serif flex items-center gap-3">
            Requests Inbox
            {leaveRequests.filter((r) => r.status === "PENDING").length > 0 && (
              <Badge variant="warning">
                {leaveRequests.filter((r) => r.status === "PENDING").length}{" "}
                Pending
              </Badge>
            )}
          </h2>

          {/* ✅ THE NEW STATUS TABS */}
          <div className="flex gap-2 border-b border-gray-200 w-full sm:w-auto">
            {["PENDING", "APPROVED", "REJECTED", "ALL"].map((tab) => (
              <button
                key={tab}
                onClick={() => setRequestTab(tab)}
                className={`px-3 py-2 text-xs uppercase tracking-wider font-medium transition-colors -mb-px ${
                  requestTab === tab
                    ? "text-black border-b-2 border-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest bg-gray-50">
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Dates</th>
                <th className="p-4 font-medium">Reason</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ UPDATED to map over filteredRequests instead of leaveRequests */}
              {filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-sm text-gray-500"
                  >
                    No {requestTab !== "ALL" ? requestTab.toLowerCase() : ""}{" "}
                    requests found.
                  </td>
                </tr>
              )}
              {filteredRequests.map((req) => (
                <tr
                  key={req.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">{req.user.name}</td>
                  <td className="p-4 text-sm flex flex-col items-start gap-1">
                    <span className="font-medium">{req.leaveType.name}</span>
                    <Badge
                      variant={req.leaveType.isPaid ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {req.leaveType.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-500">
                    {new Date(req.startDate).toLocaleDateString()} -{" "}
                    {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm text-gray-500 max-w-xs truncate">
                    {req.reason}
                  </td>
                  <td className="p-4 text-right">
                    {req.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            handleRequestAction(req.id, "REJECTED")
                          }
                          className="p-1.5 text-red-600 border border-red-200 rounded-sm hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleRequestAction(req.id, "APPROVED")
                          }
                          className="p-1.5 bg-black text-white rounded-sm hover:bg-gray-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Badge
                        variant={
                          req.status === "APPROVED" ? "success" : "error"
                        }
                      >
                        {req.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Ad-hoc Leaves */}
      <div className="border-t border-gray-200 pt-12">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-serif">Ad-Hoc Leaves</h2>
          </div>
          <button
            onClick={() => setIsAddAdHocModalOpen(true)}
            className="px-6 py-3 bg-white border border-gray-300 text-xs tracking-widest uppercase rounded-sm hover:bg-gray-50"
          >
            Create Ad-hoc Leave
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest bg-gray-50">
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Dates</th>
                <th className="p-4 font-medium">Reason</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {adHocLeaves.map((leave) => (
                <tr
                  key={leave.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">{leave.user.name}</td>
                  <td className="p-4 text-sm flex flex-col items-start gap-1">
                    <span>{leave.leaveType.name}</span>
                    <Badge
                      variant={leave.leaveType.isPaid ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {leave.leaveType.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </td>
                  <td className="p-4 font-mono text-sm text-gray-500">
                    {new Date(leave.startDate).toLocaleDateString()} -{" "}
                    {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{leave.reason}</td>
                  <td className="p-4">
                    <Badge variant="success">Approved</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      <Modal
        isOpen={isAddLeaveTypeModalOpen}
        onClose={() => setIsAddLeaveTypeModalOpen(false)}
        title="Add Leave Type"
      >
        <div className="space-y-6">
          <Input
            label="Name"
            value={newLeaveType.name}
            onChange={(e) =>
              setNewLeaveType({ ...newLeaveType, name: e.target.value })
            }
            error={errors.name}
          />
          <Select
            label="Category"
            value={newLeaveType.isPaid}
            onChange={(e) =>
              setNewLeaveType({ ...newLeaveType, isPaid: e.target.value })
            }
          >
            <option value="true">Paid Leave</option>
            <option value="false">Unpaid Leave</option>
          </Select>
          <Input
            label="Yearly Quota"
            type="number"
            value={newLeaveType.defaultAllowed}
            onChange={(e) =>
              setNewLeaveType({
                ...newLeaveType,
                defaultAllowed: e.target.value,
              })
            }
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsAddLeaveTypeModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLeaveType}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal
        isOpen={isEditLeaveTypeModalOpen}
        onClose={() => setIsEditLeaveTypeModalOpen(false)}
        title="Edit Leave Type"
      >
        <div className="space-y-6">
          <Input
            label="Name"
            value={editingLeaveType.name}
            onChange={(e) =>
              setEditingLeaveType({ ...editingLeaveType, name: e.target.value })
            }
            error={errors.editName}
          />
          <Select
            label="Category"
            value={editingLeaveType.isPaid}
            onChange={(e) =>
              setEditingLeaveType({
                ...editingLeaveType,
                isPaid: e.target.value,
              })
            }
          >
            <option value="true">Paid Leave</option>
            <option value="false">Unpaid Leave</option>
          </Select>
          <Input
            label="Yearly Quota"
            type="number"
            value={editingLeaveType.defaultAllowed}
            onChange={(e) =>
              setEditingLeaveType({
                ...editingLeaveType,
                defaultAllowed: e.target.value,
              })
            }
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsEditLeaveTypeModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleEditLeaveType}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90"
            >
              Update Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* --- AD-HOC MODAL --- */}
      <Modal
        isOpen={isAddAdHocModalOpen}
        onClose={() => setIsAddAdHocModalOpen(false)}
        title="Create Ad-hoc Leave"
      >
        <div className="space-y-6 overflow-visible">
          <div className="relative" ref={dropdownRef}>
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
                  setNewAdHocLeave({ ...newAdHocLeave, userId: "" }); // Clear selection if typing
                }}
                onFocus={() => setIsEmpDropdownOpen(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            {isEmpDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-md max-h-48 overflow-y-auto">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                      onClick={() => {
                        setNewAdHocLeave({ ...newAdHocLeave, userId: emp.id });
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
                    No employees found matching "{empSearchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
          <Select
            label="Leave Type"
            value={newAdHocLeave.leaveTypeId}
            onChange={(e) =>
              setNewAdHocLeave({
                ...newAdHocLeave,
                leaveTypeId: e.target.value,
              })
            }
          >
            <option value="">Select Category...</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newAdHocLeave.startDate}
              onChange={(e) =>
                setNewAdHocLeave({
                  ...newAdHocLeave,
                  startDate: e.target.value,
                })
              }
            />
            <Input
              label="End Date"
              type="date"
              value={newAdHocLeave.endDate}
              onChange={(e) =>
                setNewAdHocLeave({ ...newAdHocLeave, endDate: e.target.value })
              }
            />
          </div>
          <Input
            label="Specific Reason"
            value={newAdHocLeave.reason}
            onChange={(e) =>
              setNewAdHocLeave({ ...newAdHocLeave, reason: e.target.value })
            }
            placeholder="e.g. Special Conference"
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsAddAdHocModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAdHocLeave}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90"
            >
              Create & Approve
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
