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

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(true);

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

  const [holidays, setHolidays] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [autoFillYear, setAutoFillYear] = useState(new Date().getFullYear());
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const ORG_API_URL = "http://localhost:5000/api/admin/organization";
  const HOLIDAY_API_URL = "http://localhost:5000/api/admin/holidays";

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
        setLocationError("Location access denied or unavailable.");
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

  const handleAutoFill = async () => {
    if (!window.confirm(`Auto-fill national holidays for ${autoFillYear}?`))
      return;

    setIsAutoFilling(true);
    try {
      await axios.post(
        `${HOLIDAY_API_URL}/auto-fill`,
        { year: autoFillYear, countryCode: "IN" },
        { withCredentials: true },
      );
      const holidayRes = await axios.get(HOLIDAY_API_URL, {
        withCredentials: true,
      });
      setHolidays(holidayRes.data);
      showToast(`Holidays for ${autoFillYear} auto-filled!`, "success");
    } catch (error) {
      showToast("Failed to auto-fill holidays", "error");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewHoliday({ name: "", date: "" });
    setIsAddModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setIsEditMode(true);
    setEditingHolidayId(holiday.id);
    const formattedDate = new Date(holiday.date).toISOString().split("T")[0];
    setNewHoliday({ name: holiday.name, date: formattedDate });
    setIsAddModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    try {
      if (isEditMode) {
        await axios.put(`${HOLIDAY_API_URL}/${editingHolidayId}`, newHoliday, {
          withCredentials: true,
        });
        showToast("Holiday updated", "success");
      } else {
        await axios.post(HOLIDAY_API_URL, newHoliday, {
          withCredentials: true,
        });
        showToast("Holiday added", "success");
      }
      const holidayRes = await axios.get(HOLIDAY_API_URL, {
        withCredentials: true,
      });
      setHolidays(holidayRes.data);
      setIsAddModalOpen(false);
    } catch (error) {
      showToast("Failed to save holiday", "error");
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await axios.delete(`${HOLIDAY_API_URL}/${id}`, { withCredentials: true });
      setHolidays(holidays.filter((h) => h.id !== id));
      showToast("Holiday deleted", "success");
    } catch (error) {
      showToast("Failed to delete holiday", "error");
    }
  };

  const getDayOfWeek = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const filteredHolidays = holidays.filter(
    (h) => new Date(h.date).getUTCFullYear() === autoFillYear,
  );

  return (
    <div className="max-w-4xl font-sans relative">
      <Toast {...toast} onClose={hideToast} />

      {/* --- TABS NAVIGATION (High Visibility) --- */}
      <div className="flex gap-8 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-2 transition-all relative ${
            activeTab === "general"
              ? "text-black"
              : "text-gray-400 hover:text-gray-900"
          }`}
        >
          <Building2 className="w-4 h-4" /> General Profile
          {activeTab === "general" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-2 transition-all relative ${
            activeTab === "holidays"
              ? "text-black"
              : "text-gray-400 hover:text-gray-900"
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Public Holidays
          {activeTab === "holidays" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />
          )}
        </button>
      </div>

      {activeTab === "general" && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* --- Section Header --- */}
            <div className="p-6 border-b border-gray-100 bg-white">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Building2 className="w-5 h-5 text-black" /> General Information
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
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <MapPin className="w-5 h-5 text-black" /> Office Geofencing
              </h2>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-sm text-[10px] font-bold text-gray-900 uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                <Crosshair
                  className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`}
                />
                {isDetecting ? "Detecting..." : "Detect Location"}
              </button>
            </div>
            <div className="p-6 space-y-6">
              {locationError && (
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-4 border border-red-100 rounded-sm">
                  <AlertCircle className="w-4 h-4" /> {locationError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Latitude"
                  type="number"
                  name="latitude"
                  value={settings.latitude}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Longitude"
                  type="number"
                  name="longitude"
                  value={settings.longitude}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <Select
                  label="Allowed Radius"
                  name="radius"
                  value={settings.radius}
                  onChange={handleChange}
                >
                  <option value="100">100 Meters (Standard)</option>
                  <option value="500">500 Meters (Campus)</option>
                </Select>
                <Select
                  label="Geofence Enforcement"
                  name="strictGeofence"
                  value={settings.strictGeofence}
                  onChange={handleChange}
                >
                  <option value="true">Strict (Block if outside)</option>
                  <option value="false">Lenient (Flag only)</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-10 py-3 bg-black text-white text-xs font-bold rounded-sm hover:bg-gray-800 transition-all uppercase tracking-[0.2em] shadow-lg disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "holidays" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Holiday Schedule for {autoFillYear}
            </p>
            <div className="flex items-center gap-3">
              <select
                value={autoFillYear}
                onChange={(e) => setAutoFillYear(Number(e.target.value))}
                className="bg-white text-xs border border-gray-200 rounded-sm font-bold px-3 py-2 outline-none focus:border-black"
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
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-900 text-[10px] font-bold rounded-sm hover:bg-gray-100 uppercase tracking-widest"
              >
                <Download className="w-3.5 h-3.5" /> Auto-Fill
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-bold rounded-sm hover:bg-gray-800 uppercase tracking-widest"
              >
                <Plus className="w-3.5 h-3.5" /> Custom
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="p-4 text-[11px] font-bold text-gray-900 uppercase tracking-widest">
                    Holiday Name
                  </th>
                  <th className="p-4 text-[11px] font-bold text-gray-900 uppercase tracking-widest">
                    Date
                  </th>
                  <th className="p-4 text-[11px] font-bold text-gray-900 uppercase tracking-widest">
                    Day
                  </th>
                  <th className="p-4 text-[11px] font-bold text-gray-900 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="p-12 text-center text-xs font-bold text-gray-300 uppercase tracking-widest"
                    >
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((holiday) => (
                    <tr
                      key={holiday.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="p-4 text-sm font-bold text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-600">
                        {new Date(holiday.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {getDayOfWeek(holiday.date)}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(holiday)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ... Modal remains standard ... */}
    </div>
  );
}
