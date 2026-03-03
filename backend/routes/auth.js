const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const passport = require("passport");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Helper: Sets the Session Cookie (Destroyed when browser closes)
const sendTokenResponse = (res, user, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // No maxAge = Session Cookie!
  });

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgName: user.organization?.name,
    },
  });
};

router.post("/register", async (req, res) => {
  try {
    const { orgName, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Email is already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, contactEmail: email },
      });

      const dept = await tx.department.create({
        data: { name: "Administration", organizationId: org.id },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          empId: "ADMIN001",
          name: "Super Admin",
          email: email,
          password: hashedPassword,
          role: "SUPER_ADMIN",
          departmentId: dept.id,
          designation: "Owner",
          isActive: true,
        },
      });

      return { user };
    });

    const payload = { id: result.user.id, role: result.user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" }); // Token expires in 1 day on the backend

    sendTokenResponse(res, result.user, token);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed due to server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });
    if (!user.isActive)
      return res
        .status(403)
        .json({ message: "Your account has been deactivated" });
    if (user.organization && !user.organization.isActive)
      return res
        .status(403)
        .json({ message: "Organization account is suspended" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

    sendTokenResponse(res, user, token);
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        orgName: req.user.organization?.name,
      },
    });
  },
);

module.exports = router;
