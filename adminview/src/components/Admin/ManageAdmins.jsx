import React, { useState } from "react";
import { Shield, Plus, Trash2, Mail } from "lucide-react";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Badge } from "../shared/Badge";

export function ManageAdmins() {
  const [admins, setAdmins] = useState([
    {
      id: 1,
      name: "Primary Owner",
      email: "admin@company.com",
      role: "Super Admin",
      status: "Active",
    },
    {
      id: 2,
      name: "Sarah Smith",
      email: "sarah@company.com",
      role: "HR Manager",
      status: "Active",
    },
    {
      id: 3,
      name: "Mike Davis",
      email: "mike@company.com",
      role: "IT Admin",
      status: "Pending Invite",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    role: "HR Manager",
  });

  const handleInviteAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;

    const admin = {
      id: Date.now(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      status: "Pending Invite",
    };

    setAdmins([...admins, admin]);
    setIsModalOpen(false);
    setNewAdmin({ name: "", email: "", role: "HR Manager" });
    alert(`An invitation link has been sent to ${admin.email}!`);
  };

  const handleDelete = (id, role) => {
    if (role === "Super Admin") {
      alert("You cannot delete the Super Admin account.");
      return;
    }
    if (
      window.confirm("Are you sure you want to revoke this admin's access?")
    ) {
      setAdmins(admins.filter((admin) => admin.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            Admin Access & Roles
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage who has access to the LuxeHR dashboard.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          Invite Admin
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Administrator</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <tr
                key={admin.id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{admin.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {admin.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      admin.role === "Super Admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {admin.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={admin.status === "Active" ? "success" : "warning"}
                  >
                    {admin.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3 text-gray-400">
                    {admin.status === "Pending Invite" && (
                      <button
                        className="hover:text-black transition-colors"
                        title="Resend Invite"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    {admin.role !== "Super Admin" && (
                      <button
                        onClick={() => handleDelete(admin.id, admin.role)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite New Administrator"
        size="md"
      >
        <form onSubmit={handleInviteAdmin} className="space-y-6">
          <p className="text-sm text-gray-500 mb-4">
            They will receive an email with instructions on how to set their
            password and log in.
          </p>

          <Input
            label="Full Name"
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            required
            placeholder="e.g. Alex Johnson"
          />

          <Input
            label="Email Address"
            type="email"
            value={newAdmin.email}
            onChange={(e) =>
              setNewAdmin({ ...newAdmin, email: e.target.value })
            }
            required
            placeholder="alex@company.com"
          />

          <Select
            label="Assign Role"
            value={newAdmin.role}
            onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
            required
          >
            <option value="HR Manager">
              HR Manager (Full Employee Access)
            </option>
            <option value="IT Admin">IT Admin (System Settings Only)</option>
            <option value="Viewer">Viewer (Read-Only Access)</option>
          </Select>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity"
            >
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
