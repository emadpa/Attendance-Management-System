import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Building2,
  MapPin,
  Crosshair,
  Save,
  AlertCircle,
  Loader2,
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Download,
} from "lucide-react";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Modal } from "../shared/Modal";
import { Toast, useToast } from "../shared/Toast";

export function OrganizationSettings() {
  const { toast, showToast, hideToast } = useToast();

  // --- Global States ---
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);

  // --- General Settings States ---
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    orgName: "",
    contactEmail: "",
    timeZone: "Asia/Kolkata",
    latitude: "",
    longitude: "",
    radius: "100",
    strictGeofence: "true",
  });

  // --- Holiday States ---
  const [holidays, setHolidays] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });

  // --- Edit & Auto-Fill States ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [autoFillYear, setAutoFillYear] = useState(new Date().getFullYear());
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const ORG_API_URL = "http://localhost:5000/api/admin/organization";
  const HOLIDAY_API_URL = "http://localhost:5000/api/admin/holidays";

  // --- Fetch Initial Data ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [orgRes, holidayRes] = await Promise.all([
          axios.get(ORG_API_URL, { withCredentials: true }),
          axios.get(HOLIDAY_API_URL, { withCredentials: true }),
        ]);

        const data = orgRes.data;
        setSettings({
          orgName: data.name || "",
          contactEmail: data.contactEmail || "",
          timeZone: data.timeZone || "Asia/Kolkata",
          latitude: data.latitude ? data.latitude.toString() : "",
          longitude: data.longitude ? data.longitude.toString() : "",
          radius: data.allowedRadiusInMeters
            ? data.allowedRadiusInMeters.toString()
            : "100",
          strictGeofence: data.strictGeofence ? "true" : "false",
        });

        setHolidays(holidayRes.data);
      } catch (error) {
        showToast("Failed to load settings data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // --- General Settings Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetectLocation = () => {
    setIsDetecting(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setIsDetecting(false);
        showToast("Location detected successfully", "success");
      },
      (error) => {
        setLocationError(
          "Location access denied or unavailable. Please enter manually.",
        );
        setIsDetecting(false);
      },
      { enableHighAccuracy: true },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: settings.orgName,
        contactEmail: settings.contactEmail,
        timeZone: settings.timeZone,
        latitude: settings.latitude,
        longitude: settings.longitude,
        allowedRadiusInMeters: settings.radius,
        strictGeofence: settings.strictGeofence,
      };

      await axios.put(ORG_API_URL, payload, { withCredentials: true });
      showToast("Organization settings updated successfully!", "success");
    } catch (error) {
      showToast(
        error.response?.data?.error || "Failed to update settings",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --- Holiday Handlers ---
  const handleAutoFill = async () => {
    if (
      !window.confirm(
        `This will automatically fetch and add standard national holidays for India in ${autoFillYear}. Do you want to continue?`,
      )
    )
      return;

    setIsAutoFilling(true);
    try {
      await axios.post(
        `${HOLIDAY_API_URL}/auto-fill`,
        { year: autoFillYear, countryCode: "IN" },
        { withCredentials: true },
      );

      // Refresh the holidays list after bulk inserting
      const holidayRes = await axios.get(HOLIDAY_API_URL, {
        withCredentials: true,
      });
      setHolidays(holidayRes.data);
      showToast(
        `Holidays for ${autoFillYear} auto-filled successfully!`,
        "success",
      );
    } catch (error) {
      showToast(
        error.response?.data?.error || "Failed to auto-fill holidays",
        "error",
      );
    } finally {
      setIsAutoFilling(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingHolidayId(null);
    setNewHoliday({ name: "", date: "" });
    setIsAddModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setIsEditMode(true);
    setEditingHolidayId(holiday.id);
    // Format date specifically for the HTML date input (YYYY-MM-DD)
    const formattedDate = new Date(holiday.date).toISOString().split("T")[0];
    setNewHoliday({ name: holiday.name, date: formattedDate });
    setIsAddModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      showToast("Please provide both a name and a date.", "error");
      return;
    }

    try {
      if (isEditMode) {
        await axios.put(`${HOLIDAY_API_URL}/${editingHolidayId}`, newHoliday, {
          withCredentials: true,
        });
        showToast("Holiday updated successfully", "success");
      } else {
        await axios.post(HOLIDAY_API_URL, newHoliday, {
          withCredentials: true,
        });
        showToast("Holiday added successfully", "success");
      }

      // Refresh list to guarantee correct chronological sorting
      const holidayRes = await axios.get(HOLIDAY_API_URL, {
        withCredentials: true,
      });
      setHolidays(holidayRes.data);

      setIsAddModalOpen(false);
      setNewHoliday({ name: "", date: "" });
    } catch (error) {
      showToast(
        error.response?.data?.error || "Failed to save holiday",
        "error",
      );
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to remove this holiday?"))
      return;
    try {
      await axios.delete(`${HOLIDAY_API_URL}/${id}`, { withCredentials: true });
      setHolidays(holidays.filter((h) => h.id !== id));
      showToast("Holiday deleted", "success");
    } catch (error) {
      showToast("Failed to delete holiday", "error");
    }
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // --- DYNAMIC RENDER LOGIC ---
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  // ✅ FILTER HOLIDAYS BASED ON SELECTED YEAR DROPDOWN
  const filteredHolidays = holidays.filter((holiday) => {
    const holidayYear = new Date(holiday.date).getUTCFullYear();
    return holidayYear === autoFillYear;
  });

  return (
    <div className="max-w-4xl font-sans relative">
      <Toast {...toast} onClose={hideToast} />

      {/* --- TABS NAVIGATION --- */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-medium uppercase tracking-wider flex items-center gap-2 transition-colors relative ${
            activeTab === "general"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Building2 className="w-4 h-4" /> General Profile
          {activeTab === "general" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`pb-3 text-sm font-medium uppercase tracking-wider flex items-center gap-2 transition-colors relative ${
            activeTab === "holidays"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Public Holidays
          {activeTab === "holidays" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />
          )}
        </button>
      </div>

      {/* --- TAB 1: GENERAL SETTINGS --- */}
      {activeTab === "general" && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" /> General
                Information
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Organization Name"
                name="orgName"
                value={settings.orgName}
                onChange={handleChange}
                required
              />
              <Input
                label="Contact Email"
                type="email"
                name="contactEmail"
                value={settings.contactEmail}
                onChange={handleChange}
                required
              />
              <Select
                label="Default Time Zone"
                name="timeZone"
                value={settings.timeZone}
                onChange={handleChange}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" /> Office Geofencing
                </h2>
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Crosshair
                  className={`w-4 h-4 ${isDetecting ? "animate-spin" : ""}`}
                />
                {isDetecting ? "Detecting..." : "Detect Current Location"}
              </button>
            </div>
            <div className="p-6 space-y-6">
              {locationError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4" /> {locationError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={settings.latitude}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={settings.longitude}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <Select
                  label="Allowed Radius"
                  name="radius"
                  value={settings.radius}
                  onChange={handleChange}
                >
                  <option value="50">50 Meters (Strict)</option>
                  <option value="100">100 Meters (Standard)</option>
                  <option value="500">500 Meters (Campus)</option>
                </Select>
                <Select
                  label="Geofence Enforcement"
                  name="strictGeofence"
                  value={settings.strictGeofence}
                  onChange={handleChange}
                >
                  <option value="true">Strict (Block if outside radius)</option>
                  <option value="false">
                    Lenient (Flag, but allow marking)
                  </option>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity uppercase tracking-wider disabled:opacity-70"
            >
              <Save className="w-4 h-4" />{" "}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}

      {/* --- TAB 2: PUBLIC HOLIDAYS --- */}
      {activeTab === "holidays" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <p className="text-sm text-gray-500 max-w-xl">
              Holidays added here are automatically deducted from expected
              working days for attendance and payroll calculations.
            </p>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-sm border border-gray-200 shrink-0">
              <select
                value={autoFillYear}
                onChange={(e) => setAutoFillYear(Number(e.target.value))}
                className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer font-mono font-medium pl-2 pr-1"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAutoFill}
                disabled={isAutoFilling}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isAutoFilling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Auto-Fill (India)
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-sm rounded-sm hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Custom Holiday
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-widest bg-gray-50/50">
                  <th className="p-4 font-medium">Holiday Name</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Day of Week</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-8 text-center text-sm text-gray-500"
                    >
                      No holidays found for {autoFillYear}. Click "Auto-Fill" to
                      grab the calendar.
                    </td>
                  </tr>
                )}
                {filteredHolidays.map((holiday) => (
                  <tr
                    key={holiday.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4 font-medium text-gray-900">
                      {holiday.name}
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {getDayOfWeek(holiday.date)}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-1">
                      <button
                        onClick={() => openEditModal(holiday)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                        title="Edit Holiday"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT HOLIDAY MODAL --- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditMode ? "Edit Holiday" : "Add Custom Holiday"}
      >
        <div className="space-y-6">
          <Input
            label="Holiday Name"
            placeholder="e.g. Independence Day, Diwali"
            value={newHoliday.name}
            onChange={(e) =>
              setNewHoliday({ ...newHoliday, name: e.target.value })
            }
          />
          <Input
            label="Date"
            type="date"
            value={newHoliday.date}
            onChange={(e) =>
              setNewHoliday({ ...newHoliday, date: e.target.value })
            }
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveHoliday}
              className="px-6 py-2 bg-black text-white text-sm rounded-sm hover:opacity-90 transition-opacity"
            >
              {isEditMode ? "Update Holiday" : "Save Holiday"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
