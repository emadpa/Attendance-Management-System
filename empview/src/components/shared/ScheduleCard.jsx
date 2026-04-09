import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ScheduleCard({ events, onAdd, onDelete }) {
  function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return "0 min";

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-sans">
          Today's Schedule
        </h3>
        {/* <button
                    onClick={onAdd}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
                    aria-label="Add schedule item"
                >
                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-black dark:group-hover:text-white" />
                </button> */}
      </div>

      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="flex gap-4 group">
            {/* Time */}
            <div className="w-16 shrink-0 pt-1">
              <p className="text-xs font-mono text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                {event.time}
              </p>
            </div>

            {/* Details */}
            <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-4 py-1 group-hover:border-black dark:group-hover:border-white transition-colors">
              <p className="text-sm font-medium text-black dark:text-white mb-1 font-sans">
                {event.title}
              </p>
              <p className="text-sm font-medium text-black dark:text-white mb-1 font-sans">
                {event.description}
              </p>
              <p className="text-xs text-gray-400 font-sans">
                {formatDuration(event.duration)}
              </p>
            </div>

            {/* Delete Button */}
            {/* <button
              onClick={() => onDelete(event.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
              aria-label="Delete schedule item"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button> */}
          </div>
        ))}
      </div>
    </div>
  );
}
