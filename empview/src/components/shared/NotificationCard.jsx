import React from "react";
import { Plus, Trash2, Bell, Check } from "lucide-react";

export default function NotificationCard({
  notifications,
  onAdd,
  onDelete,
  onMarkAsRead,
  onMarkAllAsRead, // ✅ New prop to clear everything
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Notifications
            </h2>
          </div>
          {unreadCount > 0 && (
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} New
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ Explicit "Mark all as read" button */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onAdd}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-500 dark:text-gray-400"
            title="Simulate new notification"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No notifications at the moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`group p-4 flex items-start justify-between gap-3 transition-colors ${
                  !notif.isRead
                    ? "bg-blue-50/40 dark:bg-blue-900/10"
                    : "bg-white dark:bg-gray-800"
                }`}
              >
                {/* Left side: Dot + Content */}
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 w-2 shrink-0 flex justify-center">
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-sm ${
                        !notif.isRead
                          ? "font-medium text-black dark:text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {notif.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                  </div>
                </div>

                {/* Right side: Explicit Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {/* ✅ Explicit Mark as Read Button */}
                  {!notif.isRead && (
                    <button
                      onClick={() => onMarkAsRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(notif.id)}
                    title="Delete notification"
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
