import React, { useState } from "react";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";

export function DepartmentManagement() {
  // Mock data - replace with actual API call later
  const [departments, setDepartments] = useState([
    { id: 1, name: "Engineering", head: "Alex Johnson", employees: 24 },
    { id: 2, name: "Human Resources", head: "Sarah Smith", employees: 5 },
    { id: 3, name: "Sales & Marketing", head: "Mike Davis", employees: 12 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const handleAddDepartment = (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    // Add to list (mock logic)
    const newDept = {
      id: Date.now(),
      name: newDeptName,
      head: "Unassigned",
      employees: 0,
    };
    setDepartments([...departments, newDept]);
    setNewDeptName("");
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    setDepartments(departments.filter((dept) => dept.id !== id));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-medium text-gray-900">All Departments</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Table */}
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
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-900">
                  {dept.name}
                </td>
                <td className="px-6 py-4">{dept.head}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {dept.employees} members
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3 text-gray-400">
                    <button className="hover:text-black transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="hover:text-red-600 transition-colors"
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

      {/* Add Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-serif font-medium">
                Create New Department
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDepartment} className="p-6">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="e.g. Finance, Product Design"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
