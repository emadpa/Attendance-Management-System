import { motion, AnimatePresence } from "framer-motion";
import Icon from "./ui/icons/Icon";
import { Icons } from "./ui/icons/iconPaths";

export default function NotificationDropdown({
  notifications,
  onMarkRead,
  onMarkAll,
  onDelete,
  onClose,
  isMobile,
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          position: isMobile ? "fixed" : "absolute",
          top: isMobile ? 64 : "calc(100% + 10px)",
          right: isMobile ? 8 : 0,
          left: isMobile ? 8 : "auto",
          width: isMobile ? "auto" : 360,
          zIndex: 100,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #f1f5f9",
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid #f1f5f9",
            background: "linear-gradient(135deg,#0f172a,#1e293b)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Georgia,serif",
                margin: 0,
              }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "0 5px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onMarkAll}
              style={{
                fontSize: 11,
                color: "#a5b4fc",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
                fontWeight: 500,
                padding: 0,
              }}
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#94a3b8",
                flexShrink: 0,
              }}
            >
              <Icon d={Icons.close} size={12} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", maxHeight: isMobile ? "60vh" : 360 }}>
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  All caught up! 🎉
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10, height: 0, padding: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onMarkRead(n.id)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid #f8fafc",
                    cursor: "pointer",
                    background: n.isRead ? "transparent" : "#f5f3ff",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (n.isRead) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead
                      ? "transparent"
                      : "#f5f3ff";
                  }}
                >
                  {/* Unread dot */}
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: n.isRead ? "#cbd5e1" : "#6366f1",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#334155",
                        fontFamily: "'DM Sans',sans-serif",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontWeight: n.isRead ? 400 : 500,
                      }}
                    >
                      {n.text}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        marginTop: 3,
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {n.time}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#cbd5e1",
                      flexShrink: 0,
                      padding: 4,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "flex-start",
                      marginTop: 2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#94a3b8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#cbd5e1")
                    }
                  >
                    <Icon d={Icons.close} size={12} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #f1f5f9",
              background: "#fafafa",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "#94a3b8",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "No unread notifications"}
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}
