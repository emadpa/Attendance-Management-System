import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

export function SearchableEmployeeSelect({
  employees,
  value,
  onChange,
  label,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close the dropdown if the user clicks anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter employees based on what the Admin types
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Find the currently selected employee to display their name in the box
  const selectedEmp = employees.find((e) => e.dbId === value);

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        {/* The Clickable Box */}
        <div
          className={`flex items-center justify-between w-full px-3 py-2 border rounded-sm cursor-pointer transition-colors ${
            error
              ? "border-red-300 bg-red-50"
              : "border-gray-200 hover:border-black bg-white"
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span
            className={`text-sm truncate ${selectedEmp ? "text-gray-900" : "text-gray-400"}`}
          >
            {selectedEmp
              ? `${selectedEmp.name} (${selectedEmp.id})`
              : "Search & select an employee..."}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>

        {/* The Floating Menu with Search Bar */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl max-h-64 flex flex-col">
            {/* The Search Bar inside the dropdown */}
            <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                className="w-full text-sm bg-transparent outline-none placeholder-gray-400"
                placeholder="Type a name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus // Automatically puts the cursor in the search box
              />
            </div>

            {/* The List of Employees */}
            <div className="overflow-y-auto overflow-x-hidden">
              {filteredEmployees.length === 0 ? (
                <div className="px-4 py-4 text-sm text-gray-500 text-center">
                  No employees found matching "{searchQuery}"
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <div
                    key={emp.dbId}
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    onClick={() => {
                      onChange(emp.dbId);
                      setIsOpen(false);
                      setSearchQuery(""); // Clear search for next time
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {emp.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        {emp.id} • {emp.role}
                      </div>
                    </div>
                    {value === emp.dbId && (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
