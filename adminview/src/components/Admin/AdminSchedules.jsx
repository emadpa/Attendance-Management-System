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
  Calendar,
  Send,
  ArrowUpRight,
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

  return (
    <AdminLayout
      title="Schedules"
      description="Manage team shifts and individual working hours."
    >
      <Toast {...toast} onClose={hideToast} />

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* --- REFINED HIGH-VISIBILITY TOOLBAR --- */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white gap-6">
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Find employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black bg-gray-50/50 transition-all"
              />
            </div>

            {/* Team Select */}
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSearchQuery("");
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium bg-gray-50/50 min-w-[180px] focus:outline-none focus:border-black transition-all cursor-pointer"
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

            {/* Week Navigation */}
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 text-xs font-bold tracking-tight text-gray-800 min-w-[120px] text-center">
                {weekRange}
              </span>
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* --- PRIMARY ACTIONS: TODAY & PUBLISH --- */}
          <div className="flex items-center gap-3 w-full xl:w-auto justify-end border-t xl:border-none pt-4 xl:pt-0">
            {/* TODAY BUTTON */}
            <button
              onClick={() => setCurrentWeekOffset(0)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-95 shadow-sm"
            >
              <Calendar size={16} className="text-gray-400" />
              Today
            </button>

            <AnimatePresence>
              {hasUnsavedChanges && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleDiscard}
                  className="px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Discard
                </motion.button>
              )}
            </AnimatePresence>

            {/* PUBLISH CHANGES BUTTON */}
            <button
              onClick={handlePublish}
              disabled={!hasUnsavedChanges}
              className={`
                relative flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg
                ${
                  hasUnsavedChanges
                    ? "bg-black text-white hover:bg-zinc-800 shadow-black/20 active:scale-95 ring-2 ring-offset-2 ring-transparent"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                }
              `}
            >
              {hasUnsavedChanges ? (
                <ArrowUpRight size={18} className="text-blue-400" />
              ) : (
                <Send size={16} className="opacity-40" />
              )}
              Publish Changes
              {hasUnsavedChanges && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* --- GRID AREA (Unchanged Logic, Adjusted Loading Blur) --- */}
        <div className="overflow-x-auto relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/40 z-20 flex justify-center items-center backdrop-blur-[1px]">
              <Loader2 className="w-10 h-10 animate-spin text-black" />
            </div>
          )}

          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white">
                <th className="p-5 border-b border-r border-gray-100 w-64 sticky left-0 z-10 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 bg-white">
                  Staff Member
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="p-5 border-b border-gray-100 font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 text-center"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-20 text-center text-sm text-gray-400 italic font-serif"
                  >
                    {searchQuery
                      ? `No records found for "${searchQuery}"`
                      : "No assignments found."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const originalEmpIdx = schedules[selectedTeam].findIndex(
                    (e) => e.userId === emp.userId,
                  );
                  return (
                    <tr
                      key={emp.userId}
                      className="group hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="p-5 border-r border-gray-100 bg-white sticky left-0 z-10 font-serif font-medium text-gray-900 group-hover:bg-gray-50 transition-colors border-b">
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
                          className="p-2 border-r border-b border-gray-50 relative h-28 text-center align-middle hover:bg-zinc-100/50 transition-colors cursor-pointer select-none"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            {shiftData.type !== "off" ? (
                              <>
                                <div
                                  className={`text-[11px] inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
                                    shiftData.type === "wfh"
                                      ? "bg-blue-50 text-blue-800 border-blue-100 shadow-sm"
                                      : "bg-white text-gray-800 border-gray-200 shadow-sm"
                                  }`}
                                >
                                  <span className="font-mono font-bold tracking-tighter">
                                    {shiftData.label}
                                  </span>
                                  {shiftData.type === "wfh" && (
                                    <MapPin className="w-3 h-3 opacity-70" />
                                  )}
                                </div>
                                {shiftData.tasks?.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {shiftData.tasks.slice(0, 3).map((_, i) => (
                                      <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-black/20"
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-300 text-[10px] uppercase tracking-widest font-black">
                                Off
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL (Kept same logic, slightly cleaned padding) --- */}
      <AnimatePresence>
        {editingCell && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCell(null)}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl pointer-events-auto max-h-[90vh] overflow-y-auto border border-gray-100">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-serif font-medium text-gray-900">
                      Shift Details
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1">
                      {schedules[selectedTeam][editingCell.empIdx].name} —{" "}
                      {days[editingCell.dayIdx]}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingCell(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                      Allocation Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
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
                          className={`py-3 text-[10px] font-black uppercase tracking-[0.15em] border rounded-xl transition-all ${
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].type === type
                              ? "bg-black text-white border-black shadow-lg shadow-black/10"
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {schedules[selectedTeam][editingCell.empIdx].schedule[
                    editingCell.dayIdx
                  ].type !== "off" && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                          Shift Timing
                        </label>
                        <input
                          type="text"
                          value={
                            schedules[selectedTeam][editingCell.empIdx]
                              .schedule[editingCell.dayIdx].label
                          }
                          onChange={(e) =>
                            updateSchedule(
                              editingCell.empIdx,
                              editingCell.dayIdx,
                              {
                                ...schedules[selectedTeam][editingCell.empIdx]
                                  .schedule[editingCell.dayIdx],
                                label: e.target.value,
                              },
                            )
                          }
                          className="w-full px-4 py-4 border border-gray-200 rounded-xl text-sm font-mono focus:border-black focus:ring-4 focus:ring-black/5 focus:outline-none bg-gray-50/50 transition-all"
                        />
                      </div>
                      <div className="border-t border-gray-100 pt-8">
                        <div className="flex justify-between items-center mb-6">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Task Pipeline
                          </label>
                          <button
                            onClick={() => {
                              const currentTasks =
                                schedules[selectedTeam][editingCell.empIdx]
                                  .schedule[editingCell.dayIdx].tasks || [];
                              updateSchedule(
                                editingCell.empIdx,
                                editingCell.dayIdx,
                                {
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
                                },
                              );
                            }}
                            className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
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
                              className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 relative group transition-all hover:border-gray-300"
                            >
                              <button
                                onClick={() => {
                                  const tasks = schedules[selectedTeam][
                                    editingCell.empIdx
                                  ].schedule[editingCell.dayIdx].tasks.filter(
                                    (_, i) => i !== idx,
                                  );
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
                                className="absolute -top-2 -right-2 bg-white border border-gray-200 p-1.5 rounded-full text-gray-300 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                    Start
                                  </span>
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
                                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-mono bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                    Mins
                                  </span>
                                  <input
                                    type="number"
                                    value={task.duration}
                                    onChange={(e) => {
                                      const tasks = [
                                        ...schedules[selectedTeam][
                                          editingCell.empIdx
                                        ].schedule[editingCell.dayIdx].tasks,
                                      ];
                                      tasks[idx].duration = parseInt(
                                        e.target.value,
                                      );
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
                                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs bg-white"
                                  />
                                </div>
                              </div>
                              <input
                                type="text"
                                placeholder="Task title..."
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
                                className="w-full p-2 border-b border-gray-200 rounded-sm text-sm font-medium bg-transparent focus:outline-none focus:border-black"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-12 pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setEditingCell(null)}
                    className="px-12 py-4 bg-black text-white text-xs font-black uppercase tracking-[0.3em] rounded-xl hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-black/10"
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
