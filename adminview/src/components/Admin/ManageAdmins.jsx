import React, { useState, useEffect } from "react";
import axios from "axios";
import { Shield, Plus, Trash2, Mail, Loader2 } from "lucide-react";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Badge } from "../shared/Badge";
import { Toast, useToast } from "../shared/Toast";
import { useAuth } from "../shared/AuthContext";

export function ManageAdmins() {
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    role: "HR_MANAGER",
  });

  const API_URL = "http://localhost:5000/api/admin/manage-admins";

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(API_URL);
      setAdmins(response.data);
    } catch (error) {
      showToast("Failed to load administrators.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const formatRoleName = (roleStr) => {
    return roleStr
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;

    setIsSubmitting(true);
    try {
      await axios.post(API_URL, newAdmin);
      showToast(`Invitation sent to ${newAdmin.email}!`, "success");
      setIsModalOpen(false);
      setNewAdmin({ name: "", email: "", role: "HR_MANAGER" });
      fetchAdmins();
    } catch (error) {
      showToast(
        error.response?.data?.error || "Failed to invite administrator.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, role) => {
    if (role === "SUPER_ADMIN") {
      showToast("You cannot revoke the Super Admin account.", "error");
      return;
    }

    if (window.confirm("Are you sure you want to revoke access?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        setAdmins(admins.filter((admin) => admin.id !== id));
        showToast("Access revoked.", "success");
      } catch (error) {
        showToast("Failed to revoke access.", "error");
      }
    }
  };

  const handleResendInvite = (email) => {
    showToast(`Invitation resent to ${email}`, "success");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg border border-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden font-sans relative">
        <Toast {...toast} onClose={hideToast} />

        {/* --- HEADER SECTION --- */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gray-50 rounded-full border border-gray-100">
              <Shield className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 leading-none">
                Admin Access & Roles
              </h2>
              <p className="text-sm text-gray-500 mt-1.5">
                Manage dashboard access for{" "}
                {user?.orgName || "the organization"}.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-sm text-xs font-bold hover:bg-gray-800 transition-all uppercase tracking-widest shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Invite Admin
          </button>
        </div>

        {/* --- TABLE SECTION (Increased Header Visibility) --- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-gray-900 font-bold opacity-100">
                  Administrator
                </th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-gray-900 font-bold opacity-100">
                  Role
                </th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-gray-900 font-bold opacity-100">
                  Status
                </th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-gray-900 font-bold opacity-100 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center p-12 text-gray-400 italic"
                  >
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="hover:bg-gray-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {admin.name}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {admin.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          admin.role === "SUPER_ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {formatRoleName(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          admin.status === "Active" ? "success" : "warning"
                        }
                      >
                        {admin.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4 text-gray-400">
                        {admin.status === "Pending Invite" && (
                          <button
                            onClick={() => handleResendInvite(admin.email)}
                            className="hover:text-black transition-colors"
                            title="Resend Invite"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {admin.role !== "SUPER_ADMIN" && (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL SECTION --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewAdmin({ name: "", email: "", role: "HR_MANAGER" });
        }}
        title="Invite New Administrator"
        size="md"
      >
        <form onSubmit={handleInviteAdmin} className="space-y-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            Account Details
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
            <option value="HR_MANAGER">
              HR Manager (Full Employee Access)
            </option>
            <option value="IT_ADMIN">IT Admin (System Settings Only)</option>
            <option value="ADMIN">Admin (Standard Access)</option>
          </Select>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-8 py-2.5 bg-black text-white text-xs font-bold rounded-sm hover:bg-gray-800 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
