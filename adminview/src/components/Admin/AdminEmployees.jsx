import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Toast, useToast } from "../shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  X,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Edit2,
} from "lucide-react"; // ✅ Added Edit2

export function AdminEmployees() {
  const { toast, showToast, hideToast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  // ✅ New states for Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);

  const [newEmployee, setNewEmployee] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    team: "",
    dateOfJoining: "",
    shiftId: "",
  });
  const [errors, setErrors] = useState({});

  const API_URL = "http://localhost:8080/api/admin/employees";

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_URL);
      setEmployees(response.data.employees);
      setShifts(response.data.shifts);
      setDbDepartments(response.data.departments);

      if (response.data.departments.length > 0 && !newEmployee.team) {
        setNewEmployee((prev) => ({
          ...prev,
          team: response.data.departments[0].name,
        }));
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const processedEmployees = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return employees.map((emp) => {
      let computedStatus = emp.status;
      if (emp.dateOfJoining) {
        const joinDate = new Date(emp.dateOfJoining);
        joinDate.setHours(0, 0, 0, 0);
        if (emp.status === "Active" && joinDate > today) {
          computedStatus = "Upcoming";
        }
      }
      return { ...emp, computedStatus };
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment =
        departmentFilter === "All" || emp.team === departmentFilter;
      const matchesStatus =
        statusFilter === "All" || emp.computedStatus === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [processedEmployees, searchQuery, departmentFilter, statusFilter]);

  const filterDepartments = ["All", ...dbDepartments.map((d) => d.name)];

  // ✅ Function to open modal in ADD mode
  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    setNewEmployee({
      id: "",
      name: "",
      email: "",
      role: "",
      team: dbDepartments[0]?.name || "",
      dateOfJoining: "",
      shiftId: "",
    });
    setErrors({});
    setIsAddModalOpen(true);
  };

  // ✅ Function to open modal in EDIT mode
  const openEditModal = (emp, e) => {
    e.stopPropagation(); // Prevents the row click from opening the side panel
    setIsEditMode(true);
    setCurrentEditId(emp.dbId);

    // Format date specifically for the HTML date input
    let formattedDate = "";
    if (emp.dateOfJoining) {
      formattedDate = new Date(emp.dateOfJoining).toISOString().split("T")[0];
    }

    // Find the correct shift ID by matching the name
    const matchedShift = shifts.find((s) => s.name === emp.shiftName);

    setNewEmployee({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      team: emp.team,
      dateOfJoining: formattedDate,
      shiftId: matchedShift ? matchedShift.id : "",
    });
    setErrors({});
    setIsAddModalOpen(true);
  };

  // ✅ Handles BOTH Add and Edit Submissions
  const handleSaveEmployee = async () => {
    const validationErrors = {};
    if (!newEmployee.name.trim()) validationErrors.name = "Name is required";
    if (!newEmployee.role.trim()) validationErrors.role = "Role is required";
    if (!newEmployee.id.trim()) validationErrors.id = "ID is required";
    if (!newEmployee.email.trim()) validationErrors.email = "Email is required";
    if (!newEmployee.dateOfJoining.trim())
      validationErrors.dateOfJoining = "Date of joining is required";
    if (!newEmployee.shiftId) validationErrors.shiftId = "Shift is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const payload = {
        empId: newEmployee.id,
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
        team: newEmployee.team,
        dateOfJoining: newEmployee.dateOfJoining,
        shiftId: newEmployee.shiftId,
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/${currentEditId}`, payload);
        showToast("Employee updated successfully", "success");
      } else {
        await axios.post(API_URL, payload);
        showToast("Employee added successfully", "success");
      }

      fetchEmployees();
      setIsAddModalOpen(false);
    } catch (error) {
      showToast(
        error.response?.data?.error ||
          `Failed to ${isEditMode ? "update" : "add"} employee`,
        "error",
      );
    }
  };

  const handleDeleteEmployee = async (dbId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to deactivate this employee?")) {
      try {
        await axios.delete(`${API_URL}/${dbId}`);
        setEmployees(employees.filter((emp) => emp.dbId !== dbId));
        if (selectedEmployee?.dbId === dbId) setSelectedEmployee(null);
        showToast("Employee deactivated", "success");
      } catch (error) {
        showToast("Failed to delete employee", "error");
      }
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Employees" description="Loading personnel data...">
        <div className="flex h-64 justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Employees"
      description="Manage personnel and view attendance records."
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        {/* Filters Section remains identical */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-sm focus:border-black outline-none w-full text-sm"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-sm hover:bg-gray-50 text-sm text-gray-600 w-full sm:w-auto justify-between sm:justify-start"
            >
              <Filter className="w-4 h-4" />
              {departmentFilter === "All" ? "Department" : departmentFilter}
            </button>
            {showDepartmentDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-sm shadow-lg z-10 min-w-[160px]">
                {filterDepartments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      setDepartmentFilter(dept);
                      setShowDepartmentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {["All", "Active", "Upcoming", "Inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs uppercase tracking-wider font-medium transition-colors ${statusFilter === status ? "text-black border-b-2 border-black" : "text-gray-500 hover:text-black"}`}
            >
              {status}
            </button>
          ))}
          <button
            onClick={openAddModal}
            className="ml-auto sm:ml-4 px-4 py-2 bg-black text-white text-xs uppercase tracking-wider rounded-sm hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest bg-gray-50">
              <th className="py-4 px-4 font-medium">Employee</th>
              <th className="py-4 px-4 font-medium">ID</th>
              <th className="py-4 px-4 font-medium">Email</th>
              <th className="py-4 px-4 font-medium">Role</th>
              <th className="py-4 px-4 font-medium">Team</th>
              <th className="py-4 px-4 font-medium">Today</th>
              <th className="py-4 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="p-8 text-center text-sm text-gray-500"
                >
                  No employees found.
                </td>
              </tr>
            )}
            {filteredEmployees.map((emp) => (
              <tr
                key={emp.dbId}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer"
                onClick={() => setSelectedEmployee(emp)}
              >
                <td className="py-4 px-4 font-medium font-serif">{emp.name}</td>
                <td className="py-4 px-4 font-mono text-xs text-gray-500">
                  {emp.id}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{emp.email}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{emp.role}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{emp.team}</td>
                <td className="py-4 px-4">
                  {emp.computedStatus === "Upcoming" ? (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                      Joining Soon
                    </span>
                  ) : (
                    <Badge
                      variant={
                        emp.attendance === "Present" ? "success" : "warning"
                      }
                    >
                      {emp.attendance}{" "}
                      {emp.attendance === "Present" && `(${emp.clockIn})`}
                    </Badge>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* ✅ New Edit Button */}
                    <button
                      onClick={(e) => openEditModal(emp, e)}
                      className="text-gray-400 hover:text-blue-600 p-2 transition-colors"
                      title="Edit Employee"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteEmployee(emp.dbId, e)}
                      className="text-gray-400 hover:text-red-600 p-2 transition-colors"
                      title="Deactivate Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedEmployee && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
            />
            {/* Sliding Panel Component (Remains Identical to your code) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 p-8 sm:p-12 border-l border-gray-200 overflow-y-auto"
            >
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full mb-6 flex items-center justify-center text-3xl font-serif text-gray-400">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <h2 className="text-3xl font-serif mb-2">
                  {selectedEmployee.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-mono mb-2">
                  <span>{selectedEmployee.id}</span>
                  <span>•</span>
                  <span>{selectedEmployee.role}</span>
                </div>
                {selectedEmployee.dateOfJoining && (
                  <div className="text-xs text-gray-400 mb-4">
                    Joined:{" "}
                    {new Date(
                      selectedEmployee.dateOfJoining,
                    ).toLocaleDateString()}
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-xs font-medium text-gray-600">
                  <Clock className="w-3 h-3" />
                  Shift: {selectedEmployee.shiftName}
                </div>
              </div>
              <div className="space-y-12">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div
                      className={`text-xl font-mono font-medium mb-1 ${selectedEmployee.computedStatus === "Upcoming" ? "text-blue-600" : ""}`}
                    >
                      {selectedEmployee.computedStatus}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Status
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div className="text-xl font-mono font-medium mb-1">
                      {selectedEmployee.team}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Team
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div className="text-xl font-mono font-medium mb-1">
                      {selectedEmployee.computedStatus === "Upcoming"
                        ? "--:--"
                        : selectedEmployee.clockIn}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Punch In
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditMode ? "Edit Employee" : "Add New Employee"} // ✅ Dynamic Title
      >
        <div className="space-y-6">
          <Input
            label="Full Name"
            value={newEmployee.name}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, name: e.target.value })
            }
            error={errors.name}
            required
            placeholder="e.g. John Doe"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Employee ID"
              value={newEmployee.id}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, id: e.target.value })
              }
              error={errors.id}
              required
              disabled={isEditMode} // Usually, we don't let admins change the unique DB ID easily
              placeholder="e.g. EMP006"
            />
            <Input
              label="Email Address"
              type="email"
              value={newEmployee.email}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, email: e.target.value })
              }
              error={errors.email}
              required
              placeholder="e.g. john@university.edu"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role / Designation"
              value={newEmployee.role}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, role: e.target.value })
              }
              error={errors.role}
              required
              placeholder="e.g. Professor"
            />
            <Select
              label="Department / Team"
              value={newEmployee.team}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, team: e.target.value })
              }
              required
            >
              {dbDepartments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Joining"
              type="date"
              value={newEmployee.dateOfJoining}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  dateOfJoining: e.target.value,
                })
              }
              error={errors.dateOfJoining}
              required
            />

            <Select
              label="Default Shift"
              value={newEmployee.shiftId}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, shiftId: e.target.value })
              }
              error={errors.shiftId}
              required
            >
              <option value="">Select a shift...</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime} - {shift.endTime})
                </option>
              ))}
            </Select>
          </div>

          {shifts.length === 0 && (
            <p className="text-xs text-red-500 italic">
              No shifts found! Please create a shift in the Shifts tab first.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEmployee}
              disabled={shifts.length === 0}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {/* ✅ Dynamic Button Text */}
              {isEditMode ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
