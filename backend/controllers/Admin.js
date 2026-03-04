const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

exports.registerUser = async (req, res) => {
  try {
    const {
      empId,
      organizationId,
      name,
      email,
      password,
      departmentId,
      designation,
      role,
      dateOfJoining,
    } = req.body;

    // Validate required fields
    if (
      !empId ||
      !organizationId ||
      !name ||
      !email ||
      !password ||
      !departmentId ||
      !designation ||
      !role ||
      !dateOfJoining
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId: organizationId,
        empId: empId,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Employee ID already exists in this organization",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        empId,
        organizationId,
        name,
        email,
        password: hashedPassword,
        departmentId,
        designation,
        role,
        dateOfJoining: new Date(dateOfJoining),
        updatedAt: new Date(),
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle Prisma unique constraint error
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Email or Employee ID already exists",
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
