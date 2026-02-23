const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/overview",
  /* verifyToken, */ async (req, res) => {
    try {
      // 1. Get Organization ID (Fallback for testing)
      // const organizationId = req.user.organizationId;
      const org = await prisma.organization.findFirst();
      if (!org)
        return res.status(404).json({ message: "Organization not found" });
      const organizationId = org.id;

      // Set today's date to midnight for accurate Prisma @db.Date querying
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // 2. Fetch EVERYTHING from the database in parallel for maximum speed
      const [
        totalEmployees,
        presentToday,
        onLeaveToday,
        pendingLeaves,
        pendingTimesheets, // We will use MISSED_PUNCH for this
        recentLeaves,
        recentAttendances,
      ] = await Promise.all([
        // Count total active employees
        prisma.user.count({
          where: { organizationId, isActive: true, role: "EMPLOYEE" },
        }),

        // Count present today (Present, Late, or Half-Day)
        prisma.attendance.count({
          where: {
            organizationId,
            date: today,
            status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
          },
        }),

        // Count employees currently on approved leave today
        prisma.leaveRequest.count({
          where: {
            organizationId,
            status: "APPROVED",
            startDate: { lte: today },
            endDate: { gte: today },
          },
        }),

        // Count total pending leave requests
        prisma.leaveRequest.count({
          where: { organizationId, status: "PENDING" },
        }),

        // Count missed punches (requires manager correction)
        prisma.attendance.count({
          where: { organizationId, status: "MISSED_PUNCH" },
        }),

        // Fetch last 5 Leave Requests for the activity feed
        prisma.leaveRequest.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { name: true } },
            leaveType: { select: { name: true } },
          },
        }),

        // Fetch last 5 Attendances for the activity feed
        prisma.attendance.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { name: true } } },
        }),
      ]);

      // 3. Calculate real attendance percentage
      // Total expected = totalEmployees - onLeaveToday
      const expectedToday = totalEmployees - onLeaveToday;
      const attendanceRate =
        expectedToday > 0
          ? Math.round((presentToday / expectedToday) * 100)
          : 0;

      // 4. Format Recent Activity Feed
      let activities = [];

      // Map leaves to activity feed format
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

      // Map attendances to activity feed format
      recentAttendances.forEach((att) => {
        activities.push({
          id: `att-${att.id}`,
          user: att.user.name,
          action: att.status === "LATE" ? "clocked in late" : "clocked in",
          time: new Date(att.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          route: "/admin/employees",
          timestamp: att.createdAt,
        });
      });

      // Sort combined activities by newest first and take the top 4
      activities.sort((a, b) => b.timestamp - a.timestamp);
      activities = activities.slice(0, 4);

      // 5. Structure the exact object your React frontend is expecting
      const overviewData = {
        snapshot: {
          totalEmployees: totalEmployees,
          presentToday: presentToday,
        },
        stats: [
          {
            label: "Company Attendance",
            value: `${attendanceRate}%`,
            trend: null, // You can calculate this against yesterday's attendance later
            trendUp: true,
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
        actionCenter: {
          pendingLeaves: pendingLeaves,
          pendingTimesheets: pendingTimesheets,
        },
        recentActivity: activities,
      };

      return res.status(200).json(overviewData);
    } catch (error) {
      console.error("Error fetching overview:", error);
      return res
        .status(500)
        .json({ message: "Server error fetching overview data" });
    }
  },
);

module.exports = router;
