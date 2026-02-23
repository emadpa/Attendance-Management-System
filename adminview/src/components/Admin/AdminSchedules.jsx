import React, { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Badge } from "../shared/Badge";
import { Toast, useToast } from "../shared/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";

export function AdminSchedules() {
    const { toast, showToast, hideToast } = useToast();
    const [selectedTeam, setSelectedTeam] = useState("Engineering");
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
    const [editingCell, setEditingCell] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const teams = ["Engineering", "Product", "Design", "People"];

    const [schedules, setSchedules] = useState({
        Engineering: [
            {
                name: "John Doe",
                schedule: [
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "wfh", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [{ id: 1, time: "10:00 - 11:00", title: "Client Meeting" }] },
                    { type: "work", label: "09:00 - 16:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
            {
                name: "Charlie Wilson",
                schedule: [
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "wfh", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
            {
                name: "Sarah Johnson",
                schedule: [
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
        ],
        Product: [
            {
                name: "Jane Smith",
                schedule: [
                    { type: "wfh", label: "09:00 - 17:00", tasks: [] },
                    { type: "wfh", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
            {
                name: "Mike Brown",
                schedule: [
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
        ],
        Design: [
            {
                name: "Bob Johnson",
                schedule: [
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "work", label: "10:00 - 18:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
        ],
        People: [
            {
                name: "Alice Brown",
                schedule: [
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 17:00", tasks: [] },
                    { type: "work", label: "09:00 - 16:00", tasks: [] },
                    { type: "off", label: "Off", tasks: [] },
                    { type: "off", label: "Off", tasks: [] }
                ]
            },
        ],
    });

    // Get current week dates
    const getWeekDates = (offset) => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));

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
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const formatDate = (date) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `${months[date.getMonth()]} ${date.getDate()}`;
        };

        return `${formatDate(monday)} - ${formatDate(sunday)}`;
    };

    const days = getWeekDates(currentWeekOffset);
    const weekRange = getWeekRange(currentWeekOffset);

    // Update schedule cell
    const updateSchedule = (empIndex, dayIndex, value) => {
        setSchedules(prev => ({
            ...prev,
            [selectedTeam]: prev[selectedTeam].map((emp, eIdx) =>
                eIdx === empIndex
                    ? {
                        ...emp,
                        schedule: emp.schedule.map((shift, dIdx) =>
                            dIdx === dayIndex ? value : shift
                        )
                    }
                    : emp
            )
        }));
        setHasUnsavedChanges(true);
    };

    // Publish changes
    const handlePublish = () => {
        setHasUnsavedChanges(false);
        showToast("Schedule changes published successfully", "success");
    };

    // Discard changes
    const handleDiscard = () => {
        if (window.confirm("Are you sure you want to discard all changes?")) {
            // In a real app, you'd reload from saved state
            setHasUnsavedChanges(false);
            showToast("Changes discarded", "success");
        }
    };

    // Jump to today
    const jumpToToday = () => {
        setCurrentWeekOffset(0);
    };

    return (
        <AdminLayout title="Schedules" description="Manage team shifts and individual working hours.">
            <Toast {...toast} onClose={hideToast} />

            <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                        {/* Team Selector */}
                        <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-sm text-sm font-serif bg-white"
                        >
                            {teams.map(team => (
                                <option key={team} value={team}>{team} Team</option>
                            ))}
                        </select>

                        {/* Week Navigator */}
                        <div className="flex gap-1 bg-white border border-gray-200 rounded p-1">
                            <button
                                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2 text-sm font-mono self-center whitespace-nowrap">{weekRange}</span>
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
                            onClick={jumpToToday}
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
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${hasUnsavedChanges
                                ? "bg-black text-white hover:opacity-90"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            disabled={!hasUnsavedChanges}
                        >
                            Publish Changes
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr>
                                <th className="p-4 border-b border-r border-gray-100 bg-gray-50 w-48 sticky left-0 z-10 font-medium text-xs uppercase tracking-widest text-gray-500">
                                    Employee
                                </th>
                                {days.map(day => (
                                    <th key={day} className="p-4 border-b border-gray-100 min-w-[140px] font-medium text-xs uppercase tracking-widest text-gray-500 text-center">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {schedules[selectedTeam].map((emp, empIdx) => (
                                <tr key={empIdx} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 border-r border-gray-100 bg-white sticky left-0 z-10 font-serif font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-gray-50 transition-colors">
                                        {emp.name}
                                    </td>
                                    {emp.schedule.map((shiftData, dayIdx) => (
                                        <td
                                            key={dayIdx}
                                            onClick={() => setEditingCell({ empIdx, dayIdx, data: shiftData })}
                                            className="p-2 border-r border-gray-50 border-b border-gray-50 relative h-20 text-center align-middle hover:bg-gray-100 transition-colors cursor-pointer select-none"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                {shiftData.type !== "off" ? (
                                                    <>
                                                        <div
                                                            className={`text-xs inline-flex flex-col items-center gap-1 px-2 py-1.5 rounded border ${shiftData.type === "wfh"
                                                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                                                : "bg-white text-gray-700 border-gray-200 shadow-sm"
                                                                }`}
                                                        >
                                                            <span className="font-mono">{shiftData.label}</span>
                                                            {shiftData.type === "wfh" && <MapPin className="w-3 h-3" />}
                                                        </div>
                                                        {shiftData.tasks && shiftData.tasks.length > 0 && (
                                                            <div className="flex gap-0.5">
                                                                {shiftData.tasks.slice(0, 3).map((_, i) => (
                                                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-black/20" />
                                                                ))}
                                                                {shiftData.tasks.length > 3 && <span className="text-[8px] text-gray-400">+</span>}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-gray-300 text-xs font-mono">Off</div>
                                                )}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                    <p><strong>Tip:</strong> <span>Click any cell to manage shift details and add hourly tasks/meetings.</span></p>
                </div>
            </div>

            {/* Detail Modal */}
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
                            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-lg font-serif font-medium">Manage Schedule</h3>
                                        <p className="text-sm text-gray-500">{schedules[selectedTeam][editingCell.empIdx].name} • {days[editingCell.dayIdx]}</p>
                                    </div>
                                    <button onClick={() => setEditingCell(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Main Shift */}
                                    <div>
                                        <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Shift Status</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {["work", "wfh", "off"].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        const defaultLabel = type === "off" ? "Off" : "09:00 - 17:00";
                                                        const newVal = {
                                                            ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx],
                                                            type,
                                                            label: defaultLabel
                                                        };
                                                        updateSchedule(editingCell.empIdx, editingCell.dayIdx, newVal);
                                                        setEditingCell({ ...editingCell, data: newVal });
                                                    }}
                                                    className={`py-2 text-sm border rounded-sm capitalize ${schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].type === type
                                                        ? "bg-black text-white border-black"
                                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {type === "wfh" ? "Work from Home" : type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].type !== "off" && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Shift Hours</label>
                                                <input
                                                    type="text"
                                                    value={schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].label}
                                                    onChange={(e) => {
                                                        const newVal = { ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx], label: e.target.value };
                                                        updateSchedule(editingCell.empIdx, editingCell.dayIdx, newVal);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-sm text-sm font-mono"
                                                />
                                            </div>

                                            <div className="border-t border-gray-100 pt-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">Hourly Tasks / Meetings</label>
                                                    <button
                                                        onClick={() => {
                                                            const currentTasks = schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || [];
                                                            const newVal = {
                                                                ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx],
                                                                tasks: [...currentTasks, { id: Date.now(), time: "", title: "" }]
                                                            };
                                                            updateSchedule(editingCell.empIdx, editingCell.dayIdx, newVal);
                                                        }}
                                                        className="text-xs bg-black text-white px-2 py-1 rounded-sm hover:opacity-90"
                                                    >
                                                        + Add Task
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {(schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || []).map((task, idx) => (
                                                        <div key={task.id} className="flex gap-2 items-start">
                                                            <input
                                                                placeholder="10:00 - 11:00"
                                                                value={task.time}
                                                                onChange={(e) => {
                                                                    const tasks = [...(schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || [])];
                                                                    tasks[idx].time = e.target.value;
                                                                    updateSchedule(editingCell.empIdx, editingCell.dayIdx, { ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx], tasks });
                                                                }}
                                                                className="w-24 px-2 py-2 border border-gray-200 rounded-sm text-xs font-mono"
                                                            />
                                                            <input
                                                                placeholder="Task/Meeting description..."
                                                                value={task.title}
                                                                onChange={(e) => {
                                                                    const tasks = [...(schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || [])];
                                                                    tasks[idx].title = e.target.value;
                                                                    updateSchedule(editingCell.empIdx, editingCell.dayIdx, { ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx], tasks });
                                                                }}
                                                                className="flex-1 px-2 py-2 border border-gray-200 rounded-sm text-xs"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const tasks = (schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || []).filter((_, i) => i !== idx);
                                                                    updateSchedule(editingCell.empIdx, editingCell.dayIdx, { ...schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx], tasks });
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-red-500"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(!schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks || schedules[selectedTeam][editingCell.empIdx].schedule[editingCell.dayIdx].tasks.length === 0) && (
                                                        <div className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-sm">
                                                            No tasks added for this day.
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
