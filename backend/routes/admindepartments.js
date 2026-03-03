const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/departments
router.get("/", async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        _count: { select: { users: true } },
        head: { select: { name: true } }, // 🔥 Instantly grabs the Head's name!
      },
      orderBy: { name: "asc" },
    });

    const formattedDepartments = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      head: dept.head?.name || "Unassigned", // ✅ Now uses real data
      employees: dept._count.users,
    }));

    res.status(200).json(formattedDepartments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// POST /api/admin/departments (Add New)
router.post("/", async (req, res) => {
  try {
    const { name, headId } = req.body;

    if (!name)
      return res.status(400).json({ error: "Department name is required" });

    const newDept = await prisma.department.create({
      data: {
        name,
        // If headId is provided, use it. Otherwise, set it to null.
        headId: headId ? headId : null,
        organizationId: req.user.organizationId,
      },
      include: {
        head: { select: { name: true } }, // Fetch the new head's name immediately
      },
    });

    res.status(201).json({
      id: newDept.id,
      name: newDept.name,
      head: newDept.head?.name || "Unassigned",
      employees: 0, // Brand new department starts with 0 employees
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create department" });
  }
});
// DELETE /api/admin/departments/:id
router.delete("/:id", async (req, res) => {
  try {
    const departmentId = req.params.id;

    // 1. Safety Check: Does this department have employees?
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { _count: { select: { users: true } } },
    });

    if (!dept) return res.status(404).json({ error: "Department not found" });

    // 2. Prevent deletion if employees exist
    if (dept._count.users > 0) {
      return res.status(400).json({
        error: `Cannot delete. Please reassign the ${dept._count.users} employees first.`,
      });
    }

    // 3. Delete if empty
    await prisma.department.delete({
      where: { id: departmentId },
    });

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error deleting department" });
  }
});
// PUT /api/admin/departments/:id/head
router.put("/:id/head", async (req, res) => {
  try {
    const departmentId = req.params.id;
    const { headId } = req.body;

    // Update the department in the database
    const updatedDept = await prisma.department.update({
      where: { id: departmentId },
      data: {
        headId: headId === "" ? null : headId, // Allows unassigning a head
      },
      include: {
        head: { select: { name: true } },
        _count: { select: { users: true } },
      },
    });

    // Return the updated data formatted for the React table
    res.status(200).json({
      id: updatedDept.id,
      name: updatedDept.name,
      head: updatedDept.head?.name || "Unassigned",
      employees: updatedDept._count.users,
    });
  } catch (error) {
    console.error("Error updating department head:", error);
    res.status(500).json({ error: "Failed to update department head" });
  }
});

module.exports = router;
