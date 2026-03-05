const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/overview
router.get("/", async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // ✅ 1. Get the current Date specifically in IST (Asia/Kolkata)
    const todayISTString = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    // ✅ 2. Create a clean Midnight UTC date from that string
    const targetDate = new Date(`${todayISTString}T00:00:00.000Z`);

    // 3. Fetch EVERYTHING in parallel for maximum speed
    const [
      totalEmployees,
      eligibleForAttendance,
      presentToday,
      onLeaveToday,
      pendingLeaves,
      pendingTimesheets,
      recentLeaves,
      recentAttendances,
      holidayToday,
      scheduledOffToday,
    ] = await Promise.all([
      // Total active employees
      prisma.user.count({
        where: { organizationId, isActive: true, role: "EMPLOYEE" },
      }),
      // Eligible employees (joined on or before today)
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          role: "EMPLOYEE",
          dateOfJoining: { lte: targetDate },
        },
      }),
      // Present today
      prisma.attendance.count({
        where: {
          organizationId,
          date: targetDate,
          status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
        },
      }),
      // On approved leave today
      prisma.leaveRequest.count({
        where: {
          organizationId,
          status: "APPROVED",
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      }),
      // Pending leave requests
      prisma.leaveRequest.count({
        where: { organizationId, status: "PENDING" },
      }),
      // Missed punches (Timesheet Corrections needed)
      prisma.attendance.count({
        where: { organizationId, status: "MISSED_PUNCH" },
      }),
      // Last 5 Leave Requests
      prisma.leaveRequest.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
      }),
      // Last 5 Attendances
      prisma.attendance.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
      // 🚨 NEW: Check if today is a public holiday
      prisma.holiday.findFirst({
        where: {
          organizationId: organizationId,
          date: targetDate,
        },
      }),
      prisma.schedule.count({
        where: {
          organizationId: organizationId,
          date: targetDate,
          workType: "OFF", // Uses your new WorkType enum!
        },
      }),
    ]);

    // 🚨 NEW LOGIC: Calculate expected workforce and smartly handle holidays
    let expectedToday =
      eligibleForAttendance - onLeaveToday - scheduledOffToday;
    let attendanceDisplayValue = "0%";
    let isTrendUp = false;
    let trendText = "Today";

    if (holidayToday) {
      // 1. If it is a holiday, override the math completely
      attendanceDisplayValue = "Holiday";
      expectedToday = 0;
      trendText = null; // Hide the "Today" subtext on holidays for a cleaner UI
    } else if (expectedToday > 0) {
      // 2. Normal working day math
      const attendanceRate = Math.round((presentToday / expectedToday) * 100);
      attendanceDisplayValue = `${attendanceRate}%`;
      isTrendUp = attendanceRate >= 80; // Green arrow if 80% or higher
    }

    // Format Recent Activity Feed
    let activities = [];

    recentLeaves.forEach((leave) => {
      activities.push({
        id: `leave-${leave.id}`,
        user: leave.user.name,
        action: `requested ${leave.leaveType.name}`,
        time: new Date(leave.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        route: "/admin/leaves",
        timestamp: leave.createdAt,
      });
    });

    recentAttendances.forEach((att) => {
      activities.push({
        id: `att-${att.id}`,
        user: att.user.name,
        action: att.status === "LATE" ? "clocked in late" : "clocked in",
        time: new Date(att.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        route: "/admin/attendance",
        timestamp: att.createdAt,
      });
    });

    // Sort combined activities by newest first and take top 4
    activities.sort((a, b) => b.timestamp - a.timestamp);
    activities = activities.slice(0, 4);

    // Send data to React
    return res.status(200).json({
      snapshot: { totalEmployees, presentToday },
      stats: [
        {
          label: "Company Attendance",
          value: attendanceDisplayValue, // ✅ Now uses "95%" OR "Holiday"
          trend: trendText,
          trendUp: isTrendUp,
        },
        {
          label: "On Leave Today",
          value: onLeaveToday.toString(),
          trend: null,
        },
        {
          label: "Pending Requests",
          value: pendingLeaves.toString(),
          trend: null,
        },
      ],
      actionCenter: { pendingLeaves, pendingTimesheets },
      recentActivity: activities,
      chartData: [],
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ message: "Server error fetching overview data" });
  }
});

module.exports = router;
