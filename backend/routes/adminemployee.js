const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/employees
router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId; // Automatically comes from Passport cookie!

    // ✅ FIX: Force the date to be calculated based on India Standard Time (IST)
    const todayISTString = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    // Create a clean Midnight UTC date from that string to match the database perfectly
    const targetDate = new Date(`${todayISTString}T00:00:00.000Z`);

    // 1. Fetch active employees
    const employees = await prisma.user.findMany({
      where: { organizationId: orgId, role: "EMPLOYEE", isActive: true },
      include: {
        department: true,
        shift: true, // Fetch their assigned shift
        // ✅ FIX: Use the timezone-safe targetDate
        attendances: { where: { date: targetDate }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch available Shifts and Departments for the frontend dropdowns
    const shifts = await prisma.shift.findMany({
      where: { organizationId: orgId },
    });
    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
    });

    // Format employee data
    const formattedEmployees = employees.map((emp) => {
      const todayAttendance = emp.attendances[0];
      return {
        dbId: emp.id,
        id: emp.empId,
        name: emp.name,
        email: emp.email,
        role: emp.designation,
        team: emp.department?.name || "Unassigned",
        shiftName: emp.shift?.name || "No Shift Assigned",
        status: emp.isActive ? "Active" : "Inactive",
        attendance: todayAttendance ? "Present" : "Absent",
        clockIn: todayAttendance?.punchIn
          ? new Date(todayAttendance.punchIn).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--",
        dateOfJoining: emp.dateOfJoining,
      };
    });

    // Return everything the frontend needs!
    return res.json({
      employees: formattedEmployees,
      shifts: shifts,
      departments: departments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch data" });
  }
});

// POST /api/admin/employees
router.post("/", async (req, res) => {
  try {
    const { empId, name, email, role, team, dateOfJoining, shiftId } = req.body;

    if (!shiftId) {
      return res.status(400).json({ error: "A Default Shift is required." });
    }

    let department = await prisma.department.findFirst({
      where: { name: team, organizationId: req.user.organizationId },
    });

    if (!department) {
      department = await prisma.department.create({
        data: { name: team, organizationId: req.user.organizationId },
      });
    }

    const hashedPassword = await bcrypt.hash("Welcome@123", 10);

    // ✅ FIX: Ensure the joining date doesn't suffer timezone shifts when saving
    // An HTML date input sends "YYYY-MM-DD". Appending T00:00:00.000Z ensures it saves exactly on that day.
    const safeJoinDate = new Date(`${dateOfJoining}T00:00:00.000Z`);

    const newEmployee = await prisma.user.create({
      data: {
        organizationId: req.user.organizationId,
        empId: empId,
        name: name,
        email: email,
        password: hashedPassword,
        role: "EMPLOYEE",
        departmentId: department.id,
        designation: role,
        dateOfJoining: safeJoinDate,
        shiftId: shiftId,
        isActive: true,
      },
    });

    return res.status(201).json(newEmployee);
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Employee ID or Email already exists." });
    }
    return res.status(500).json({ error: "Failed to create employee" });
  }
});

// DELETE /api/admin/employees/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return res.json({ message: "Employee successfully deactivated" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete employee" });
  }
});

// PUT /api/admin/employees/:id (Update an existing employee)
router.put("/:id", async (req, res) => {
  try {
    const { empId, name, email, role, team, dateOfJoining, shiftId } = req.body;

    // 1. Check if the department needs to be created or linked
    let department = await prisma.department.findFirst({
      where: { name: team, organizationId: req.user.organizationId },
    });

    if (!department) {
      department = await prisma.department.create({
        data: { name: team, organizationId: req.user.organizationId },
      });
    }

    // 2. Lock the timezone for the Date of Joining update
    const safeJoinDate = new Date(`${dateOfJoining}T00:00:00.000Z`);

    // 3. Update the user in the database
    const updatedEmployee = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        empId: empId,
        name: name,
        email: email,
        role: "EMPLOYEE",
        departmentId: department.id,
        designation: role,
        dateOfJoining: safeJoinDate,
        shiftId: shiftId,
      },
    });

    return res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Employee ID or Email already exists." });
    }
    return res.status(500).json({ error: "Failed to update employee" });
  }
});

module.exports = router;
