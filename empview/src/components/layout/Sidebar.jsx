import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../App";
import { useNavigate } from "react-router-dom";
import Icon from "../ui/icons/Icon";
import { Icons } from "../ui/icons/iconPaths";

export default function Sidebar({
  active,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  orgName,
}) {
  const { logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout(); // clears state + disconnects socket + clears cookie
    nav("/", { replace: true }); // redirect to login
  };
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
    { id: "profile", label: "Profile", icon: Icons.profile },
    { id: "attendance", label: "Attendance", icon: Icons.attendance },
    // Calendar now navigates to its own page
    { id: "calendar", label: "Calendar", icon: Icons.calendar },
    { id: "leave", label: "Leave", icon: Icons.leave },
  ];

  // console.log(userName, orgName, designation);
  const NavContent = ({ forMobile = false }) => (
    <>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b border-white/10"
        style={{ minHeight: 68 }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <span
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              fontFamily: "Georgia,serif",
            }}
          >
            G
          </span>
        </div>
        {(!collapsed || forMobile) && (
          <div>
            <p
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.08em",
                fontFamily: "Georgia,serif",
                whiteSpace: "nowrap",
              }}
            >
              {orgName || "GEC THRISSUR"}
            </p>
            <p
              style={{
                color: "#94a3b8",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Employee Portal
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (forMobile) onMobileClose();
              }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left"
              style={{
                background: isActive ? "rgba(99,102,241,0.18)" : "transparent",
                color: isActive ? "#a5b4fc" : "#94a3b8",
                border: isActive
                  ? "1px solid rgba(99,102,241,0.3)"
                  : "1px solid transparent",
              }}
            >
              <span
                className="flex-shrink-0"
                style={{ color: isActive ? "#818cf8" : "#64748b" }}
              >
                <Icon d={item.icon} size={18} />
              </span>
              {(!collapsed || forMobile) && (
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 400,
                    fontFamily: "'DM Sans',sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              )}
              {isActive && (!collapsed || forMobile) && (
                <motion.div
                  layoutId={forMobile ? "activePillMobile" : "activePill"}
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#818cf8" }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.12)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
          }
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ color: "#f87171" }}
          >
            <Icon d={Icons.logout} size={18} />
          </div>
          {(!collapsed || forMobile) && (
            <div className="flex-1 min-w-0">
              <p
                style={{
                  color: "#f87171",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'DM Sans',sans-serif",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                Logout
              </p>
            </div>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex fixed left-0 top-0 h-full z-30 flex-col"
        style={{
          background: "linear-gradient(180deg,#0f172a 0%,#1e293b 100%)",
          overflow: "hidden",
        }}
      >
        <NavContent />
        <button
          onClick={onToggle}
          className="absolute top-5 right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#94a3b8",
          }}
        >
          <motion.span
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <Icon d="M15 18l-6-6 6-6" size={12} />
          </motion.span>
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 md:hidden"
              style={{
                background: "rgba(15,23,42,0.55)",
                backdropFilter: "blur(3px)",
              }}
            />
            <motion.div
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 h-full z-50 flex flex-col md:hidden"
              style={{
                width: 260,
                background: "linear-gradient(180deg,#0f172a 0%,#1e293b 100%)",
                overflow: "hidden",
              }}
            >
              <NavContent forMobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
