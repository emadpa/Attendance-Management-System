const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/shifts
router.get("/", async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        _count: { select: { users: true } }, // Count how many employees use this shift
      },
      orderBy: { startTime: "asc" },
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// POST /api/admin/shifts
router.post("/", async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    const newShift = await prisma.shift.create({
      data: {
        name,
        startTime,
        endTime,
        organizationId: req.user.organizationId,
      },
      include: {
        _count: { select: { users: true } },
      },
    });
    res.status(201).json(newShift);
  } catch (error) {
    res.status(500).json({ error: "Failed to create shift" });
  }
});

// DELETE /api/admin/shifts/:id
router.delete("/:id", async (req, res) => {
  try {
    const shiftId = req.params.id;

    // Safety check
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { _count: { select: { users: true } } },
    });

    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift._count.users > 0) {
      return res.status(400).json({
        error: `Cannot delete. ${shift._count.users} employees are assigned to this shift.`,
      });
    }

    await prisma.shift.delete({ where: { id: shiftId } });
    res.json({ message: "Shift deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete shift" });
  }
});

module.exports = router;
