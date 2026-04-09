import Dashboard from "../../pages/Dashboard";
import Attendance from "../../pages/AttendanceMarking";
import Calendar from "../../pages/CalendarPage";
import Leave from "../../pages/EmployeeLeavePage";
import ScheduleCalendar from "../../pages/ScheduleCalendar";
import AttendanceReportPage from "../../pages/AttendanceReportPage";

import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import { useState } from "react";

export default function MainLayout({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [applyLeaveMode, setApplyLeaveMode] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case "attendance":
        return <Attendance />;
      case "calendar":
        return <Calendar />;
      case "schedule":
        return <ScheduleCalendar />;
      case "reports":
        return <AttendanceReportPage />;
      case "leave":
        return (
          <Leave
            defaultApply={applyLeaveMode}
            onApplyClose={() => setApplyLeaveMode(false)}
          />
        );
      default:
        return (
          <Dashboard
            onNavigate={(page) => {
              if (page === "leave-apply") {
                setApplyLeaveMode(true); // ← set apply mode
                setActivePage("leave");
              } else {
                setApplyLeaveMode(false);
                setActivePage(page);
              }
            }}
          />
        );
    }
  };
  const sidebarW = collapsed ? 72 : 240;
  //   console.log(user.user.name);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:#f8fafc;}
        .line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        button{cursor:pointer;}
        .dash-main{padding:20px 16px 40px; transition:margin-left 0.3s ease;}
        @media(min-width:768px){.dash-main{margin-left:${sidebarW}px; padding:28px 28px 48px;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div
        className="min-h-screen flex"
        style={{ background: "#f8fafc", fontFamily: "'DM Sans',sans-serif" }}
      >
        <Sidebar
          active={activePage}
          onNavigate={setActivePage}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          orgName={user?.user?.orgName}
        />

        <main
          className="dash-main flex-1 min-w-0"
          style={{ minHeight: "100vh" }}
        >
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            <TopBar
              name={user?.user?.name}
              // unreadCount={notifications.filter((n) => !n.isRead).length}
              onMenuClick={() => setMobileOpen(true)}
            />

            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
}
