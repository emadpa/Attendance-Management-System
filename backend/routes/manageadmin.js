const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/manage-admins
router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Fetch all users who have an Admin-level role
    const admins = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "IT_ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedAdmins = admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      status: a.isActive ? "Active" : "Pending Invite",
    }));

    res.json(formattedAdmins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch administrators" });
  }
});

// POST /api/admin/manage-admins (Invite Admin)
// ✅ Removed mockAuth here
router.post("/", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const orgId = req.user.organizationId;

    let adminDept = await prisma.department.findFirst({
      where: { name: "Administration", organizationId: orgId },
    });

    if (!adminDept) {
      adminDept = await prisma.department.create({
        data: { name: "Administration", organizationId: orgId },
      });
    }

    const hashedPassword = await bcrypt.hash("Welcome@123", 10);
    const generatedEmpId = `ADM${Math.floor(Math.random() * 10000)}`;

    const newAdmin = await prisma.user.create({
      data: {
        organizationId: orgId,
        empId: generatedEmpId,
        name,
        email,
        password: hashedPassword,
        role: role,
        departmentId: adminDept.id,
        designation: "Administrator",
        isActive: false,
      },
    });

    res.status(201).json(newAdmin);
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "A user with this email already exists." });
    }
    res.status(500).json({ error: "Failed to invite administrator" });
  }
});

// DELETE /api/admin/manage-admins/:id (Revoke Access)
// ✅ Removed mockAuth here
router.delete("/:id", async (req, res) => {
  try {
    const targetAdmin = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!targetAdmin) return res.status(404).json({ error: "Admin not found" });
    if (targetAdmin.role === "SUPER_ADMIN") {
      return res
        .status(400)
        .json({ error: "Cannot revoke Super Admin access." });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { role: "EMPLOYEE", isActive: false },
    });

    res.json({ message: "Administrator access revoked successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke access" });
  }
});

module.exports = router;
