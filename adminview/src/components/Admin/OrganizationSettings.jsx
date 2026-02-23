import React, { useState } from "react";
import { Building2, MapPin, Crosshair, Save, AlertCircle } from "lucide-react";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";

export function OrganizationSettings() {
  // Mock initial state - In reality, fetch this from your backend
  const [settings, setSettings] = useState({
    orgName: "LuxeHR Technologies",
    contactEmail: "admin@company.com",
    timeZone: "Asia/Kolkata",
    latitude: "",
    longitude: "",
    radius: "100",
    strictGeofence: "true",
  });

  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError(
          "Location access denied or unavailable. Please enter manually.",
        );
        setIsDetecting(false);
      },
      { enableHighAccuracy: true }, // Forces highest precision possible
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);

    // Mock API Call to update Organization Schema
    setTimeout(() => {
      alert("Organization settings updated successfully!");
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl font-sans">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              General Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Basic details about your organization.
            </p>
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

        {/* Geofencing & Location Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Office Geofencing
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set your office coordinates. Employees must be within the
                  allowed radius to mark attendance.
                </p>
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
          </div>

          <div className="p-6 space-y-6">
            {locationError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="w-4 h-4" />
                {locationError}
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
                  placeholder="e.g. 10.778912"
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
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
                  placeholder="e.g. 76.654321"
                  className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
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
                <option value="500">500 Meters (Campus/Large Office)</option>
                <option value="1000">1 Kilometer</option>
              </Select>

              <Select
                label="Geofence Enforcement"
                name="strictGeofence"
                value={settings.strictGeofence}
                onChange={handleChange}
              >
                <option value="true">Strict (Block if outside radius)</option>
                <option value="false">Lenient (Flag, but allow marking)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90 transition-opacity uppercase tracking-wider disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
