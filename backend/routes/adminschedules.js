const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Helper: Convert "YYYY-MM-DD" to Date object at midnight UTC
const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`);

// ==========================================
// GET /api/admin/schedules?startDate=YYYY-MM-DD
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { startDate } = req.query;
    const orgId = req.user.organizationId; // Real Org ID from Passport

    if (!startDate)
      return res.status(400).json({ error: "startDate is required" });

    const start = parseDate(startDate);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    // ✅ 1. Fetch ALL departments (Even empty ones!)
    const allDepartments = await prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });

    // Create the grouped object with every single department
    const groupedSchedules = {};
    allDepartments.forEach((dept) => {
      groupedSchedules[dept.name] = [];
    });
    groupedSchedules["Unassigned"] = []; // Always add a fallback

    // 2. Fetch all active employees
    const users = await prisma.user.findMany({
      where: { organizationId: orgId, role: "EMPLOYEE", isActive: true },
      include: { department: true, shift: true },
    });

    // 3. Fetch custom schedule overrides for this week
    const customSchedules = await prisma.schedule.findMany({
      where: {
        organizationId: orgId,
        date: { gte: start, lte: end },
      },
    });

    const scheduleMap = {};
    customSchedules.forEach((sch) => {
      const dateStr = sch.date.toISOString().split("T")[0];
      scheduleMap[`${sch.userId}_${dateStr}`] = sch;
    });

    // 4. Fill the grouped structure with employees
    users.forEach((user) => {
      const deptName = user.department?.name || "Unassigned";

      // Safety check in case a department was deleted but user still has the ID
      if (!groupedSchedules[deptName]) groupedSchedules[deptName] = [];

      const userWeek = weekDates.map((dateStr) => {
        const customSch = scheduleMap[`${user.id}_${dateStr}`];

        if (customSch) {
          const typeMap = { OFFICE: "work", WFH: "wfh", OFF: "off" };
          return {
            userId: user.id,
            date: dateStr,
            type: typeMap[customSch.workType],
            label:
              customSch.workType === "OFF"
                ? "Off"
                : `${customSch.startTime} - ${customSch.endTime}`,
            tasks: customSch.tasks || [],
          };
        }

        const d = parseDate(dateStr);
        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

        if (user.shift) {
          return {
            userId: user.id,
            date: dateStr,
            type: isWeekend ? "off" : "work",
            label: isWeekend
              ? "Off"
              : `${user.shift.startTime} - ${user.shift.endTime}`,
            tasks: [],
          };
        }

        return {
          userId: user.id,
          date: dateStr,
          type: "off",
          label: "Off",
          tasks: [],
        };
      });

      groupedSchedules[deptName].push({
        userId: user.id,
        name: user.name,
        schedule: userWeek,
      });
    });

    // Only send departments back if we successfully built the groupedSchedules object
    const departments = Object.keys(groupedSchedules);

    return res.status(200).json({ schedules: groupedSchedules, departments });
  } catch (error) {
    console.error("Schedules fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch schedules" });
  }
});
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { updates } = req.body; // Array of cells that were changed
    const orgId = req.user.organizationId;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: "Invalid updates format" });
    }

    // Use Prisma Transactions to efficiently upsert all changes
    const transactions = updates.map((update) => {
      const typeMap = { work: "OFFICE", wfh: "WFH", off: "OFF" };
      let startTime = null,
        endTime = null;

      // Extract hours if it's a working day
      if (update.type !== "off" && update.label.includes("-")) {
        [startTime, endTime] = update.label.split("-").map((str) => str.trim());
      }

      return prisma.schedule.upsert({
        where: {
          userId_date: {
            userId: update.userId,
            date: parseDate(update.date),
          },
        },
        update: {
          workType: typeMap[update.type],
          startTime,
          endTime,
          tasks: update.tasks || [],
        },
        create: {
          organizationId: orgId,
          userId: update.userId,
          date: parseDate(update.date),
          workType: typeMap[update.type],
          startTime,
          endTime,
          tasks: update.tasks || [],
        },
      });
    });

    await prisma.$transaction(transactions);

    return res.status(200).json({ message: "Successfully updated schedules" });
  } catch (error) {
    console.error("Schedules save error:", error);
    return res.status(500).json({ error: "Failed to save schedules" });
  }
});

module.exports = router;
