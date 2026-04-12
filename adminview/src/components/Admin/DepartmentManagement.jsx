import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, MoreHorizontal, Edit, Trash2, Loader2, X } from "lucide-react";
import { Toast, useToast } from "../shared/Toast";
import { Input } from "../shared/Input";
import { SearchableEmployeeSelect } from "../shared/SearchableEmployeeSelect";

export function DepartmentManagement() {
  const { toast, showToast, hideToast } = useToast();

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeptData, setNewDeptData] = useState({ name: "", headId: "" });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState({
    id: "",
    name: "",
    headId: "",
  });

  const API_URL = "http://localhost:8080/api/admin/departments";
  const EMPLOYEES_API_URL = "http://localhost:8080/api/admin/employees";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptResponse, empResponse] = await Promise.all([
        axios.get(API_URL),
        axios.get(EMPLOYEES_API_URL),
      ]);

      setDepartments(deptResponse.data);
      setEmployees(empResponse.data.employees);
    } catch (error) {
      console.error(error);
      showToast("Failed to load department data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptData.name.trim()) return;

    try {
      const response = await axios.post(API_URL, {
        name: newDeptData.name,
        headId: newDeptData.headId,
      });

      setDepartments([...departments, response.data]);
      setNewDeptData({ name: "", headId: "" });
      setIsModalOpen(false);
      showToast("Department created successfully", "success");
    } catch (error) {
      showToast(
        error.response?.data?.error || "Failed to create department",
        "error",
      );
    }
  };

  const handleUpdateHead = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/${editingDept.id}/head`, {
        headId: editingDept.headId,
      });

      setDepartments(
        departments.map((dept) =>
          dept.id === editingDept.id ? response.data : dept,
        ),
      );

      setIsEditModalOpen(false);
      showToast("Department Head updated successfully", "success");
    } catch (error) {
      showToast("Failed to update Department Head", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        setDepartments(departments.filter((dept) => dept.id !== id));
        showToast("Department deleted", "success");
      } catch (error) {
        showToast(
          error.response?.data?.error || "Failed to delete department",
          "error",
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-sm border border-gray-200 shadow-sm flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden relative">
        <Toast {...toast} onClose={hideToast} />

        {/* --- OPTIMIZED HEADER SECTION --- */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-serif font-semibold text-gray-900 tracking-tight">
              All Departments
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Organize structural units and assign leadership roles.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-gray-800 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Department Name</th>
                <th className="px-6 py-4 font-medium">Department Head</th>
                <th className="px-6 py-4 font-medium">Employees</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) => (
                <tr
                  key={dept.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4">
                    {dept.head === "Unassigned" ? (
                      <span className="text-gray-400 italic">Unassigned</span>
                    ) : (
                      <span className="font-medium text-gray-700">
                        {dept.head}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {dept.employees} members
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 text-gray-400">
                      <button
                        onClick={() => {
                          setEditingDept({
                            id: dept.id,
                            name: dept.name,
                            headId: dept.headId || "",
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-black transition-all"
                        title="Assign Department Head"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                        title="Delete department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="hover:text-black transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No departments found. Add your first department to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD DEPARTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-visible">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-serif font-medium">
                Create New Department
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewDeptData({ name: "", headId: "" });
                }}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="p-6 space-y-6">
              <Input
                label="Department Name"
                required
                value={newDeptData.name}
                onChange={(e) =>
                  setNewDeptData({ ...newDeptData, name: e.target.value })
                }
                placeholder="e.g. Computer Science, Library"
              />

              <SearchableEmployeeSelect
                label="Department Head (Optional)"
                employees={employees}
                value={newDeptData.headId}
                onChange={(selectedId) =>
                  setNewDeptData({ ...newDeptData, headId: selectedId })
                }
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setNewDeptData({ name: "", headId: "" });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT DEPARTMENT HEAD MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-visible">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-serif font-medium">
                Assign Department Head
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHead} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Department
                </label>
                <div className="px-4 py-3 border border-gray-200 bg-gray-50 rounded-sm text-sm text-gray-700 font-medium">
                  {editingDept.name}
                </div>
              </div>

              <SearchableEmployeeSelect
                label="Select New Head"
                employees={employees}
                value={editingDept.headId}
                onChange={(selectedId) =>
                  setEditingDept({ ...editingDept, headId: selectedId })
                }
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
