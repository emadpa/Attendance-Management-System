const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// HELPER: Date & Balance Calculation
// ==========================================

// Calculates inclusive days between two dates
const calculateDays = (startDate, endDate) => {
  let count = 0;
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  // Set time to midnight UTC to avoid timezone shifting issues
  currentDate.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  // Loop through every day from start to end
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay(); // 0 is Sunday, 6 is Saturday

    // Only count the day if it is a weekday (Monday - Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }

    // Move to the next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return count;
};

// Safely updates or creates the LeaveBalance record
const updateLeaveBalance = async (
  userId,
  leaveTypeId,
  days,
  operation = "increment",
) => {
  // Try to find an existing balance tracking record
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      userId_leaveTypeId: {
        userId: userId,
        leaveTypeId: leaveTypeId,
      },
    },
  });

  if (balance) {
    // If it exists, increment or decrement the 'used' count
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        used: {
          [operation]: days,
        },
      },
    });
  } else if (operation === "increment") {
    // If it doesn't exist yet, fetch the default rules and create it
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    await prisma.leaveBalance.create({
      data: {
        userId: userId,
        leaveTypeId: leaveTypeId,
        used: days,
        allowed: leaveType ? leaveType.defaultAllowed : 0,
      },
    });
  }
};

// ==========================================
// 1. LEAVE TYPES (The Rules)
// ==========================================
router.get("/types", async (req, res) => {
  try {
    const types = await prisma.leaveType.findMany({
      where: { organizationId: req.user.organizationId },
    });
    return res.json(types);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leave types" });
  }
});

router.post("/types", async (req, res) => {
  try {
    const { name, defaultAllowed, isPaid } = req.body;
    const newType = await prisma.leaveType.create({
      data: {
        name,
        defaultAllowed: parseInt(defaultAllowed),
        isPaid: isPaid ?? true,
        organizationId: req.user.organizationId,
      },
    });
    return res.status(201).json(newType);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create leave type" });
  }
});

router.delete("/types/:id", async (req, res) => {
  try {
    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!leaveType) {
      return res
        .status(404)
        .json({ error: "Leave type not found or unauthorized" });
    }
    await prisma.leaveType.delete({
      where: { id: req.params.id, organizationId: req.user.organizationId },
    });
    return res.json({ message: "Deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete leave type" });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        user: { select: { name: true, empId: true } },
        leaveType: { select: { name: true, isPaid: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const inbox = requests.filter((r) => r.isAdHoc === false);
    const adHoc = requests.filter((r) => r.isAdHoc === true);

    const employees = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        role: "EMPLOYEE",
        isActive: true,
      },
      select: { id: true, name: true, empId: true },
    });

    return res.json({ inbox, adHoc, employees });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

router.put("/requests/:id/status", async (req, res) => {
  try {
    const { status } = req.body; // e.g., "APPROVED", "REJECTED"

    // 🚨 We wrap EVERYTHING inside prisma.$transaction
    // Notice we use `tx` (transaction) instead of `prisma` inside this block!
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the request
      const existingReq = await tx.leaveRequest.findUnique({
        where: { id: req.params.id },
        include: { leaveType: true },
      });

      if (!existingReq) throw new Error("Leave request not found");

      const daysRequested = calculateDays(
        existingReq.startDate,
        existingReq.endDate,
      );

      // 2. BALANCE CHECK
      if (existingReq.status !== "APPROVED" && status === "APPROVED") {
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId: {
              userId: existingReq.userId,
              leaveTypeId: existingReq.leaveTypeId,
            },
          },
        });

        const allowedDays = balance
          ? balance.allowed
          : existingReq.leaveType.defaultAllowed;
        const usedDays = balance ? balance.used : 0;
        const daysRemaining = allowedDays - usedDays;

        if (allowedDays > 0 && daysRequested > daysRemaining) {
          // Throwing an error instantly cancels the entire transaction
          throw new Error(
            `Insufficient balance! Employee only has ${daysRemaining} days left.`,
          );
        }
      }

      // 3. Update the request status
      const updated = await tx.leaveRequest.update({
        where: { id: req.params.id },
        data: { status, reviewedById: req.user.id, reviewedAt: new Date() },
      });

      // 4. Update the balance using the transaction (tx)
      if (existingReq.status !== "APPROVED" && status === "APPROVED") {
        await updateLeaveBalance(
          tx,
          existingReq.userId,
          existingReq.leaveTypeId,
          daysRequested,
          "increment",
        );
      } else if (
        existingReq.status === "APPROVED" &&
        (status === "REJECTED" || status === "CANCELLED")
      ) {
        await updateLeaveBalance(
          tx,
          existingReq.userId,
          existingReq.leaveTypeId,
          daysRequested,
          "decrement",
        );
      }

      return updated;
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    // If our custom error was thrown, send a 400 Bad Request. Otherwise send 500.
    if (
      error.message.includes("Insufficient balance") ||
      error.message.includes("not found")
    ) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to update status" });
  }
});
router.post("/requests/ad-hoc", async (req, res) => {
  try {
    const { userId, leaveTypeId, startDate, endDate, reason } = req.body;

    // 1. Timezone safe dates and calculation
    const safeStart = new Date(`${startDate}T00:00:00.000Z`);
    const safeEnd = new Date(`${endDate}T00:00:00.000Z`);
    const daysRequested = calculateDays(safeStart, safeEnd);

    // 2. Fetch leave rules and the employee's current balance
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId: { userId, leaveTypeId },
      },
    });

    // 3. 🚨 THE BALANCE CHECK 🚨
    const allowedDays = balance
      ? balance.allowed
      : leaveType
        ? leaveType.defaultAllowed
        : 0;
    const usedDays = balance ? balance.used : 0;
    const daysRemaining = allowedDays - usedDays;

    // If it is a quota-based leave and they ask for too much, block the Admin!
    if (allowedDays > 0 && daysRequested > daysRemaining) {
      return res.status(400).json({
        error: `Cannot create Ad-Hoc Leave: Employee only has ${daysRemaining} days left, but you are assigning ${daysRequested} days.`,
      });
    }

    // 4. Create the Auto-Approved record (Only runs if they pass the check!)
    const adHoc = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId,
        organizationId: req.user.organizationId,
        startDate: safeStart,
        endDate: safeEnd,
        reason,
        status: "APPROVED",
        isAdHoc: true,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        reviewerNotes: "Ad-Hoc Leave generated manually by Administration.",
      },
      include: {
        user: { select: { name: true } },
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    // 5. Automatically deduct these days from the employee's balance
    await updateLeaveBalance(userId, leaveTypeId, daysRequested, "increment");

    return res.status(201).json(adHoc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create ad-hoc leave" });
  }
});
// PUT /api/admin/leaves/types/:id
router.put("/types/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, defaultAllowed, isPaid } = req.body;

    // 1. Ensure the leave type exists and belongs to this organization
    const existingType = await prisma.leaveType.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });

    if (!existingType) {
      return res.status(404).json({ error: "Leave type not found" });
    }

    // 2. Update the record
    const updatedType = await prisma.leaveType.update({
      where: { id: req.params.id },
      data: {
        name,
        defaultAllowed: parseInt(defaultAllowed) || 0,
        isPaid: isPaid === true || isPaid === "true", // Handles both boolean and string
      },
    });

    return res.json(updatedType);
  } catch (error) {
    console.error("Update leave type error:", error);
    return res.status(500).json({ error: "Failed to update leave type" });
  }
});

module.exports = router;
