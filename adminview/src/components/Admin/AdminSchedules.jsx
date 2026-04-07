import React, { useState, useEffect } from "react";
import axios from "axios";
import { AdminLayout } from "./AdminLayout";
import { Toast, useToast } from "../shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  Loader2,
  Search,
  Clock,
  AlignLeft,
} from "lucide-react";

export function AdminSchedules() {
  const { toast, showToast, hideToast } = useToast();

  const [schedules, setSchedules] = useState({});
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [editingCell, setEditingCell] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [changedCells, setChangedCells] = useState({});
  const hasUnsavedChanges = Object.keys(changedCells).length > 0;

  const API_URL = "http://localhost:5000/api/admin/schedules";

  // --- Date Math Helpers ---
  const getMondayOfOffset = (offset) => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1 + offset * 7);
    const offsetDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  };

  const getWeekDates = (offset) => {
    const mondayStr = getMondayOfOffset(offset);
    const monday = new Date(`${mondayStr}T00:00:00`);
    const dates = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(`${days[i]} ${date.getDate()}`);
    }
    return dates;
  };

  const getWeekRange = (offset) => {
    const mondayStr = getMondayOfOffset(offset);
    const monday = new Date(`${mondayStr}T00:00:00`);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (date) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };
    return `${format(monday)} - ${format(sunday)}`;
  };

  const days = getWeekDates(currentWeekOffset);
  const weekRange = getWeekRange(currentWeekOffset);

  // --- API Fetch ---
  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const mondayDate = getMondayOfOffset(currentWeekOffset);
      const response = await axios.get(`${API_URL}?startDate=${mondayDate}`, {
        withCredentials: true,
      });

      setSchedules(response.data.schedules);
      setTeams(response.data.departments);

      if (response.data.departments.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data.departments[0]);
      }

      setChangedCells({});
    } catch (error) {
      showToast("Failed to load schedules", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentWeekOffset]);

  // --- Local UI Update & Change Tracking ---
  const updateSchedule = (empIdx, dayIdx, newVal) => {
    const targetUserId = newVal.userId;
    const targetDate = newVal.date;

    setSchedules((prev) => {
      const updatedSchedules = { ...prev };
      updatedSchedules[selectedTeam][empIdx].schedule[dayIdx] = newVal;
      return updatedSchedules;
    });

    setChangedCells((prev) => ({
      ...prev,
      [`${targetUserId}_${targetDate}`]: newVal,
    }));
  };

  const handlePublish = async () => {
    try {
      const updates = Object.values(changedCells);
      await axios.post(API_URL, { updates }, { withCredentials: true });

      setChangedCells({});
      setEditingCell(null);
      showToast("Schedule changes published successfully!", "success");
    } catch (error) {
      showToast("Failed to save changes", "error");
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard all changes?")) {
      fetchSchedules();
      setEditingCell(null);
      showToast("Changes discarded", "success");
    }
  };

  const filteredEmployees = (schedules[selectedTeam] || []).filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading && Object.keys(schedules).length === 0) {
    return (
      <AdminLayout title="Schedules" description="Loading data...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Schedules"
      description="Manage team shifts and individual working hours."
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Find employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>

            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSearchQuery("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-sm text-sm font-serif bg-white min-w-[150px]"
            >
              {teams.length === 0 && (
                <option value="">No teams available</option>
              )}
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <div className="flex gap-1 bg-white border border-gray-200 rounded p-1">
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-mono self-center whitespace-nowrap">
                {weekRange}
              </span>
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentWeekOffset(0)}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-300 rounded-sm hover:border-black transition-colors"
            >
              Today
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={handleDiscard}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-300 rounded-sm hover:border-red-500 hover:text-red-600 transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={handlePublish}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 ${
                hasUnsavedChanges
                  ? "bg-black text-white hover:opacity-90"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              disabled={!hasUnsavedChanges}
            >
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
              Publish Changes
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div className="overflow-x-auto relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 z-20 flex justify-center items-center backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-gray-100 bg-gray-50 w-48 sticky left-0 z-10 font-medium text-xs uppercase tracking-widest text-gray-500">
                  Employee
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="p-4 border-b border-gray-100 min-w-[140px] font-medium text-xs uppercase tracking-widest text-gray-500 text-center"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="p-8 text-center text-sm text-gray-500"
                  >
                    {searchQuery
                      ? `No employees found matching "${searchQuery}"`
                      : "No employees assigned to this team."}
                  </td>
                </tr>
              )}
              {filteredEmployees.map((emp) => {
                const originalEmpIdx = schedules[selectedTeam].findIndex(
                  (e) => e.userId === emp.userId,
                );

                return (
                  <tr
                    key={emp.userId}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 border-r border-gray-100 bg-white sticky left-0 z-10 font-serif font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50 transition-colors">
                      {emp.name}
                    </td>
                    {emp.schedule.map((shiftData, dayIdx) => (
                      <td
                        key={dayIdx}
                        onClick={() =>
                          setEditingCell({
                            empIdx: originalEmpIdx,
                            dayIdx,
                            data: shiftData,
                          })
                        }
                        className="p-2 border-r border-gray-50 border-b border-gray-50 relative h-20 text-center align-middle hover:bg-gray-100 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex flex-col items-center gap-1">
                          {shiftData.type !== "off" ? (
                            <>
                              <div
                                className={`text-xs inline-flex flex-col items-center gap-1 px-2 py-1.5 rounded border ${shiftData.type === "wfh" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-white text-gray-700 border-gray-200 shadow-sm"}`}
                              >
                                <span className="font-mono">
                                  {shiftData.label}
                                </span>
                                {shiftData.type === "wfh" && (
                                  <MapPin className="w-3 h-3" />
                                )}
                              </div>
                              {shiftData.tasks &&
                                shiftData.tasks.length > 0 && (
                                  <div className="flex gap-0.5 mt-1">
                                    {shiftData.tasks.slice(0, 3).map((_, i) => (
                                      <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-black/20"
                                      />
                                    ))}
                                    {shiftData.tasks.length > 3 && (
                                      <span className="text-[8px] text-gray-400 -mt-1">
                                        +
                                      </span>
                                    )}
                                  </div>
                                )}
                            </>
                          ) : (
                            <div className="text-gray-300 text-xs font-mono">
                              Off
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DETAIL MODAL --- */}
      <AnimatePresence>
        {editingCell && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCell(null)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
            >
              <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-xl pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-serif font-medium">
                      Manage Schedule
                    </h3>
                    <p className="text-sm text-gray-500">
                      {schedules[selectedTeam][editingCell.empIdx].name} •{" "}
                      {days[editingCell.dayIdx]}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingCell(null)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status Toggle */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                      Shift Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["work", "wfh", "off"].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            const defaultLabel =
                              type === "off" ? "Off" : "09:00 - 17:00";
                            const newVal = {
                              ...schedules[selectedTeam][editingCell.empIdx]
                                .schedule[editingCell.dayIdx],
                              type,
                              label: defaultLabel,
                            };
                            updateSchedule(
                              editingCell.empIdx,
                              editingCell.dayIdx,
                              newVal,
                            );
                            setEditingCell({ ...editingCell, data: newVal });
                          }}
                          className={`py-2 text-sm border rounded-sm capitalize ${
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].type === type
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {type === "wfh" ? "Work from Home" : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {schedules[selectedTeam][editingCell.empIdx].schedule[
                    editingCell.dayIdx
                  ].type !== "off" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                          Shift Hours
                        </label>
                        <input
                          type="text"
                          value={
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].label
                          }
                          onChange={(e) => {
                            const newVal = {
                              ...schedules[selectedTeam][editingCell.empIdx]
                                .schedule[editingCell.dayIdx],
                              label: e.target.value,
                            };
                            updateSchedule(
                              editingCell.empIdx,
                              editingCell.dayIdx,
                              newVal,
                            );
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm font-mono focus:border-black focus:outline-none"
                        />
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">
                            Daily Tasks / Schedule
                          </label>
                          <button
                            onClick={() => {
                              const currentTasks =
                                schedules[selectedTeam][editingCell.empIdx]
                                  .schedule[editingCell.dayIdx].tasks || [];
                              const newVal = {
                                ...schedules[selectedTeam][editingCell.empIdx]
                                  .schedule[editingCell.dayIdx],
                                tasks: [
                                  ...currentTasks,
                                  {
                                    id: Date.now(),
                                    time: "09:00",
                                    title: "",
                                    duration: 30,
                                    description: "",
                                  },
                                ],
                              };
                              updateSchedule(
                                editingCell.empIdx,
                                editingCell.dayIdx,
                                newVal,
                              );
                            }}
                            className="text-xs bg-black text-white px-3 py-1.5 rounded-sm hover:opacity-90 transition-opacity"
                          >
                            + Add Task
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].tasks || []
                          ).map((task, idx) => (
                            <div
                              key={task.id}
                              className="p-4 border border-gray-200 rounded-md bg-gray-50/50 space-y-3 relative group"
                            >
                              <button
                                onClick={() => {
                                  const tasks = (
                                    schedules[selectedTeam][editingCell.empIdx]
                                      .schedule[editingCell.dayIdx].tasks || []
                                  ).filter((_, i) => i !== idx);
                                  updateSchedule(
                                    editingCell.empIdx,
                                    editingCell.dayIdx,
                                    {
                                      ...schedules[selectedTeam][
                                        editingCell.empIdx
                                      ].schedule[editingCell.dayIdx],
                                      tasks,
                                    },
                                  );
                                }}
                                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Task"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Time Input */}
                                <div className="col-span-1">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Time
                                  </label>
                                  <div className="relative">
                                    <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type="time"
                                      value={task.time}
                                      onChange={(e) => {
                                        const tasks = [
                                          ...schedules[selectedTeam][
                                            editingCell.empIdx
                                          ].schedule[editingCell.dayIdx].tasks,
                                        ];
                                        tasks[idx].time = e.target.value;
                                        updateSchedule(
                                          editingCell.empIdx,
                                          editingCell.dayIdx,
                                          {
                                            ...schedules[selectedTeam][
                                              editingCell.empIdx
                                            ].schedule[editingCell.dayIdx],
                                            tasks,
                                          },
                                        );
                                      }}
                                      className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-sm text-sm font-mono focus:border-black focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Duration Input */}
                                <div className="col-span-1">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Duration (Mins)
                                  </label>
                                  <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={task.duration}
                                    onChange={(e) => {
                                      const tasks = [
                                        ...schedules[selectedTeam][
                                          editingCell.empIdx
                                        ].schedule[editingCell.dayIdx].tasks,
                                      ];
                                      tasks[idx].duration =
                                        parseInt(e.target.value) || 0;
                                      updateSchedule(
                                        editingCell.empIdx,
                                        editingCell.dayIdx,
                                        {
                                          ...schedules[selectedTeam][
                                            editingCell.empIdx
                                          ].schedule[editingCell.dayIdx],
                                          tasks,
                                        },
                                      );
                                    }}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-sm text-sm focus:border-black focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Title Input */}
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Task Title
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Client Meeting"
                                  value={task.title}
                                  onChange={(e) => {
                                    const tasks = [
                                      ...schedules[selectedTeam][
                                        editingCell.empIdx
                                      ].schedule[editingCell.dayIdx].tasks,
                                    ];
                                    tasks[idx].title = e.target.value;
                                    updateSchedule(
                                      editingCell.empIdx,
                                      editingCell.dayIdx,
                                      {
                                        ...schedules[selectedTeam][
                                          editingCell.empIdx
                                        ].schedule[editingCell.dayIdx],
                                        tasks,
                                      },
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 border border-gray-200 rounded-sm text-sm focus:border-black focus:outline-none font-medium"
                                />
                              </div>

                              {/* Description Input */}
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                  Details (Optional)
                                </label>
                                <div className="relative">
                                  <AlignLeft className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                                  <textarea
                                    placeholder="Add any specific notes or instructions..."
                                    value={task.description}
                                    onChange={(e) => {
                                      const tasks = [
                                        ...schedules[selectedTeam][
                                          editingCell.empIdx
                                        ].schedule[editingCell.dayIdx].tasks,
                                      ];
                                      tasks[idx].description = e.target.value;
                                      updateSchedule(
                                        editingCell.empIdx,
                                        editingCell.dayIdx,
                                        {
                                          ...schedules[selectedTeam][
                                            editingCell.empIdx
                                          ].schedule[editingCell.dayIdx],
                                          tasks,
                                        },
                                      );
                                    }}
                                    rows={2}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-sm text-sm focus:border-black focus:outline-none resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!schedules[selectedTeam][editingCell.empIdx]
                            .schedule[editingCell.dayIdx].tasks ||
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].tasks.length ===
                              0) && (
                            <div className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-sm">
                              No tasks assigned for this shift yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setEditingCell(null)}
                    className="px-6 py-2 bg-black text-white text-sm font-medium rounded-sm hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}