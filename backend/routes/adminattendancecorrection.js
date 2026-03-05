const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/attendance
router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Fetch records for the last 7 days to keep the dashboard snappy
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const records = await prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        date: { gte: sevenDaysAgo },
      },
      include: {
        user: { select: { name: true, empId: true } },
      },
      orderBy: [{ date: "desc" }, { punchIn: "desc" }],
    });

    res.json(records);
  } catch (error) {
    console.error("Fetch attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// PUT /api/admin/attendance/:id/correct
// PUT /api/admin/attendance/:id/correct
router.put("/:id/correct", async (req, res) => {
  try {
    const recordId = req.params.id;
    const { punchOutTime, reason } = req.body;

    // 1. Fetch the existing record
    const existingRecord = await prisma.attendance.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return res.status(404).json({ error: "Record not found" });
    }

    // 2. Parse the punchOut time
    const recordDate = new Date(existingRecord.date);
    const [hours, minutes] = punchOutTime.split(":");
    const punchOutDate = new Date(recordDate);
    punchOutDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // 3. Update the database
    const updatedRecord = await prisma.attendance.update({
      where: { id: recordId },
      data: {
        punchOut: punchOutDate,
        status: "PRESENT",
        isManualEntry: true,
      },
      include: {
        user: { select: { name: true, empId: true } },
      },
    });

    // 🚨 THE ONLY NEW BACKEND CODE NEEDED 🚨
    // Grab Socket.IO and broadcast the update to the React frontend instantly!
    const io = req.app.get("io");
    if (io) {
      io.emit("attendance_updated", updatedRecord);
    }

    res.json(updatedRecord);
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Failed to correct timesheet" });
  }
});

module.exports = router;
