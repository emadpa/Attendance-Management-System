import React, { useState, useMemo } from "react";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Toast, useToast } from "../shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, Plus, Trash2 } from "lucide-react";

export function AdminEmployees() {
  const { toast, showToast, hideToast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const [employees, setEmployees] = useState([
    {
      id: "EMP001",
      name: "John Doe",
      email: "john@company.com",
      role: "Senior Developer",
      team: "Engineering",
      status: "Active",
      attendance: "Present",
      clockIn: "09:15 AM",
    },
    {
      id: "EMP002",
      name: "Jane Smith",
      email: "jane@company.com",
      role: "Product Manager",
      team: "Product",
      status: "On Leave",
      attendance: "Absent",
    },
    {
      id: "EMP003",
      name: "Bob Johnson",
      email: "bob@company.com",
      role: "Designer",
      team: "Design",
      status: "Active",
      attendance: "Present",
      clockIn: "09:15 AM",
    },
    {
      id: "EMP004",
      name: "Alice Brown",
      email: "alice@company.com",
      role: "HR Specialist",
      team: "People",
      status: "Inactive",
      attendance: "Absent",
    },
    {
      id: "EMP005",
      name: "Charlie Wilson",
      email: "charlie@company.com",
      role: "Backend Developer",
      team: "Engineering",
      status: "Active",
      attendance: "Present",
      clockIn: "09:00 AM",
    },
  ]);

  const [newEmployee, setNewEmployee] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    team: "Engineering",
    status: "Active",
  });

  const [errors, setErrors] = useState({});

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment =
        departmentFilter === "All" || emp.team === departmentFilter;
      const matchesStatus =
        statusFilter === "All" || emp.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  // Add employee
  const handleAddEmployee = () => {
    const validationErrors = {};
    if (!newEmployee.name.trim()) validationErrors.name = "Name is required";
    if (!newEmployee.role.trim()) validationErrors.role = "Role is required";

    if (!newEmployee.id.trim()) validationErrors.id = "ID is required";
    if (!newEmployee.email.trim()) validationErrors.email = "Email is required";

    // Check for duplicate ID
    if (employees.some((emp) => emp.id === newEmployee.id)) {
      validationErrors.id = "ID already exists";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const employee = {
      ...newEmployee,
      attendance: "Present",
    };

    setEmployees([...employees, employee]);
    setIsAddModalOpen(false);
    setIsAddModalOpen(false);
    setNewEmployee({
      id: "",
      name: "",
      email: "",
      role: "",
      team: "Engineering",
      status: "Active",
    });
    setErrors({});
    setErrors({});
    showToast("Employee added successfully", "success");
  };

  // Delete employee
  const handleDeleteEmployee = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setEmployees(employees.filter((emp) => emp.id !== id));
      if (selectedEmployee?.id === id) {
        setSelectedEmployee(null);
      }
      showToast("Employee deleted", "success");
    }
  };

  const departments = ["All", "Engineering", "Product", "Design", "People"];

  return (
    <AdminLayout
      title="Employees"
      description="Manage personnel and view attendance records."
    >
      <Toast {...toast} onClose={hideToast} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
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
                {departments.map((dept) => (
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
          {["All", "Active", "On Leave"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs uppercase tracking-wider font-medium transition-colors ${
                statusFilter === status
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {status}
            </button>
          ))}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="ml-auto sm:ml-4 px-4 py-2 bg-black text-white text-xs uppercase tracking-wider rounded-sm hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-t border-gray-200 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-widest">
              <th className="py-4 font-medium">Employee</th>
              <th className="py-4 font-medium">ID</th>
              <th className="py-4 font-medium">Email</th>
              <th className="py-4 font-medium">Role</th>
              <th className="py-4 font-medium">Team</th>
              <th className="py-4 font-medium">Status</th>
              <th className="py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors group"
              >
                <td
                  onClick={() => setSelectedEmployee(emp)}
                  className="py-4 font-medium font-serif cursor-pointer"
                >
                  {emp.name}
                </td>
                <td className="py-4 font-mono text-xs text-gray-500">
                  {emp.id}
                </td>
                <td className="py-4 text-sm text-gray-600">{emp.email}</td>
                <td className="py-4 text-sm text-gray-600">{emp.role}</td>
                <td className="py-4 text-sm text-gray-600">{emp.team}</td>
                <td className="py-4">
                  <Badge
                    variant={
                      emp.attendance === "Present"
                        ? "success"
                        : emp.attendance === "Absent"
                          ? "error"
                          : "warning"
                    }
                  >
                    {emp.attendance}
                  </Badge>
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Slide-over */}
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
                <div className="flex items-center gap-4 text-sm text-gray-500 font-mono">
                  <span>{selectedEmployee.id}</span>
                  <span>•</span>
                  <span>{selectedEmployee.role}</span>
                </div>
              </div>

              <div className="space-y-12">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div className="text-xl font-mono font-medium mb-1">
                      92%
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Attendance
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div className="text-xl font-mono font-medium mb-1">
                      09:05
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Avg In
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-sm text-center">
                    <div className="text-xl font-mono font-medium mb-1">4</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest">
                      Leaves
                    </div>
                  </div>
                </div>

                {/* Recent Attendance */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4 font-serif">
                    Recent History
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-2 border-b border-gray-50"
                      >
                        <span className="text-gray-500">Feb {10 + i}</span>
                        <span className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          Present
                        </span>
                        <span className="font-mono text-gray-400">
                          09:00 - 17:00
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button className="w-full py-3 bg-black text-white text-sm uppercase tracking-wider rounded-sm hover:opacity-90 transition-opacity">
                    Assign Schedule
                  </button>
                  <button className="w-full py-3 border border-gray-200 text-black text-sm uppercase tracking-wider rounded-sm hover:bg-gray-50 transition-colors">
                    Grant Ad-hoc Leave
                  </button>
                  <button className="w-full py-3 text-gray-400 text-sm hover:text-black transition-colors">
                    View Full Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewEmployee({
            name: "",
            role: "",
            team: "Engineering",
            status: "Active",
          });
          setErrors({});
        }}
        title="Add New Employee"
        size="md"
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
              placeholder="e.g. john@company.com"
            />
          </div>

          <Input
            label="Role"
            value={newEmployee.role}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, role: e.target.value })
            }
            error={errors.role}
            required
            placeholder="e.g. Senior Developer"
          />

          <Select
            label="Team"
            value={newEmployee.team}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, team: e.target.value })
            }
            required
          >
            <option>Engineering</option>
            <option>Product</option>
            <option>Design</option>
            <option>People</option>
          </Select>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setNewEmployee({
                  id: "",
                  name: "",
                  email: "",
                  role: "",
                  team: "Engineering",
                  status: "Active",
                });
                setErrors({});
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEmployee}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              Add Employee
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
