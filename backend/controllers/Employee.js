const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const axios = require("axios");
const FormData = require("form-data");
const bcrypt = require("bcrypt");
const { startOfDay } = require("date-fns");

console.log(Object.keys(prisma));

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

/**
 * Helper to merge "HH:MM" string with Date
 */
const mergeDateAndTime = (date, timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours);
  newDate.setMinutes(minutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

exports.registerBiometric = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    // Send image to Python service
    const formData = new FormData();
    formData.append("image", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const encodingResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/generate-encoding`,
      formData,
      {
        headers: formData.getHeaders(),
      },
    );

    if (!encodingResponse.data.success) {
      return res.status(400).json({
        error: encodingResponse.data.error,
      });
    }

    const faceEncoding = encodingResponse.data.encoding;

    // ✅ Update using Prisma
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        faceEmbedding: faceEncoding, // must match Prisma schema type
        isBiometricRegistered: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Biometric registered successfully",
    });
  } catch (err) {
    console.error("Biometric error:", err);

    // Handle case where user does not exist
    if (err.code === "P2025") {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { empId, password } = req.body;

    if (!empId || !password) {
      return res.status(400).json({
        error: "empId and password are required",
      });
    }

    // Find user by empId
    const user = await prisma.user.findFirst({
      where: {
        empId: empId,
      },
      include: {
        organization: {
          select: { name: true },
        },
        department: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    // Remove password from response
    const {
      password: _,
      organizationId,
      departmentId,
      ...userWithoutPassword
    } = user;

    // Check biometric registration
    if (!user.isBiometricRegistered) {
      return res.status(200).json({
        success: true,
        requiresBiometric: true,
        message: "Biometric not registered. Please upload photo.",
        user: userWithoutPassword,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * AUTO CREATE WFH ATTENDANCE
 */
exports.autoCreateWFHAttendance = async (req, res) => {
  try {
    const today = startOfDay(new Date());

    // 1️⃣ Get WFH schedules for today
    const schedules = await prisma.schedule.findMany({
      where: {
        date: today,
        workType: "WFH",
      },
    });

    let createdCount = 0;

    for (const schedule of schedules) {
      const { userId, organizationId, startTime, endTime } = schedule;

      // 2️⃣ Prevent duplicate attendance
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });

      if (existingAttendance) continue;

      let finalStartTime = startTime;
      let finalEndTime = endTime;

      // 3️⃣ If schedule does not override time, fetch shift
      if (!finalStartTime || !finalEndTime) {
        const shift = await prisma.shift.findFirst({
          where: {
            organizationId,
          },
        });

        if (!shift) continue;

        finalStartTime = shift.startTime; // "09:00"
        finalEndTime = shift.endTime; // "17:00"
      }

      // 4️⃣ Merge date with text time
      const punchIn = mergeDateAndTime(today, finalStartTime);
      const punchOut = mergeDateAndTime(today, finalEndTime);

      // 5️⃣ Create attendance
      await prisma.attendance.create({
        data: {
          userId,
          organizationId,
          date: today,
          punchIn,
          punchOut,
          status: "PRESENT",
          isGeofenceValid: true,
          isLivenessVerified: true,
        },
      });

      createdCount++;
    }

    return res.status(200).json({
      message: "WFH attendance auto-created successfully",
      createdCount,
    });
  } catch (error) {
    console.error("Auto WFH Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getYearlyAttendancePercentage = async (req, res) => {
  try {
    const { userId, year } = req.params;

    const startDate = new Date(Number(year), 0, 1);
    const endDate = new Date(Number(year), 11, 31);

    // Total working days (exclude OFF)
    const totalWorkingDays = await prisma.schedule.count({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        NOT: {
          workType: "OFF",
        },
      },
    });

    // Total present days
    const totalPresentDays = await prisma.attendance.count({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "PRESENT",
      },
    });

    const attendancePercentage =
      totalWorkingDays === 0
        ? 0
        : Number(((totalPresentDays / totalWorkingDays) * 100).toFixed(2));

    return res.status(200).json({
      year,
      totalWorkingDays,
      totalPresentDays,
      attendancePercentage,
    });
  } catch (error) {
    console.error("Attendance Percentage Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /employee/dashboard
exports.getDashboard = async (req, res) => {
  const { userId } = req.body;
  //   const orgId = req.user.organizationId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      empId: true,
      organizationId: true,
      designation: true,
      dateOfJoining: true,
      department: { select: { name: true } },
      shift: { select: { startTime: true, endTime: true } },
      isBiometricRegistered: true,
    },
  });
  const leaveBalances = await prisma.leaveBalance.findMany({
    where: { userId },
    include: { leaveType: { select: { name: true } } },
  });

  const attendanceSummary = await prisma.attendance.findMany({
    where: {
      userId,
      date: {
        gte: new Date(`${new Date().getFullYear()}-01-01`),
        lte: new Date(),
      },
    },
    select: { status: true, punchIn: true, punchOut: true },
  });

  // Determine the start date for this year's attendance
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(`${currentYear}-01-01`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If employee joined this year, start from joining date, else Jan 1
  const joiningDate = new Date(user.dateOfJoining);
  const periodStart =
    joiningDate.getFullYear() === currentYear && joiningDate > yearStart
      ? joiningDate
      : yearStart;

  // Get all holidays in the org for this period
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId: user.organizationId, // make sure to select this in user query
      date: {
        gte: periodStart,
        lte: today,
      },
    },
    select: { date: true },
  });

  // Convert holidays to a Set of "YYYY-MM-DD" strings for O(1) lookup
  const holidaySet = new Set(
    holidays.map((h) => new Date(h.date).toISOString().split("T")[0]),
  );

  // Count working days: exclude Sundays and holidays
  let totalWorkingDays = 0;
  const cursor = new Date(periodStart);

  while (cursor <= today) {
    const isSunday = cursor.getDay() === 0; // 0 = Sunday
    const dateKey = cursor.toISOString().split("T")[0];
    const isHoliday = holidaySet.has(dateKey);

    if (!isSunday && !isHoliday) {
      totalWorkingDays++;
    }

    cursor.setDate(cursor.getDate() + 1); // move to next day
  }
  //   const [user, leaveBalances, attendanceSummary] = await Promise.all([
  //     prisma.user.findUnique({
  //       where: { id: userId },
  //       select: {
  //         name: true,
  //         empId: true,
  //         designation: true,
  //         dateOfJoining: true,
  //         department: { select: { name: true } },
  //         shift: { select: { startTime: true, endTime: true } },
  //         isBiometricRegistered: true,
  //       },
  //     }),

  //     // Leave balances with type name
  //     prisma.leaveBalance.findMany({
  //       where: { userId },
  //       include: { leaveType: { select: { name: true } } },
  //     }),

  //     // All attendance records this year for avg punch times
  //     prisma.attendance.findMany({
  //       where: {
  //         userId,
  //         date: {
  //           gte: new Date(`${new Date().getFullYear()}-01-01`),
  //           lte: new Date(),
  //         },
  //       },
  //       select: { status: true, punchIn: true, punchOut: true },
  //     }),
  //   ]);

  // Calculate averages
  const presentDays = attendanceSummary.filter((a) =>
    ["PRESENT", "LATE", "HALF_DAY"].includes(a.status),
  );

  const avgPunchIn = average(
    presentDays
      .filter((a) => a.punchIn)
      .map((a) => minutesSinceMidnight(a.punchIn)),
  );
  const avgPunchOut = average(
    presentDays
      .filter((a) => a.punchOut)
      .map((a) => minutesSinceMidnight(a.punchOut)),
  );

  //   const totalWorkingDays = attendanceSummary.length;
  const yearlyPercentage = totalWorkingDays
    ? ((presentDays.length / totalWorkingDays) * 100).toFixed(1)
    : 0;

  return res.json({
    user,
    leaveBalances: leaveBalances.map((lb) => ({
      type: lb.leaveType.name,
      allowed: lb.allowed,
      used: lb.used,
      remaining: lb.allowed - lb.used,
    })),
    attendance: {
      yearlyPercentage,
      avgPunchIn: minutesToTime(avgPunchIn),
      avgPunchOut: minutesToTime(avgPunchOut),
      totalPresent: presentDays.length,
      totalWorkingDays,
    },
  });
};

const minutesSinceMidnight = (date) => date.getHours() * 60 + date.getMinutes();
const average = (nums) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(mins % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
};
// controllers/employee/scheduleController.js

exports.getTodaySchedule = async (req, res) => {
  try {
    const { userId } = req.body; // from auth middleware

    // Get today's date in YYYY-MM-DD (no time component, matches `date` column type)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedule = await prisma.schedule.findUnique({
      where: {
        // uses the unique index: Schedule_userId_date_key
        userId_date: {
          userId: userId,
          date: today,
        },
      },
      select: {
        tasks: true,
      },
    });

    if (!schedule) {
      return res.status(200).json({
        success: true,
        message: "No schedule found for today",
        data: null,
      });
    }

    // tasks is JSONB — Prisma returns it as a parsed JS array already
    const sortedTasks = Array.isArray(schedule.tasks)
      ? schedule.tasks.sort((a, b) => {
          // Sort by time ascending if tasks have a time field
          if (a.time && b.time) return a.time.localeCompare(b.time);
          return 0;
        })
      : [];

    return res.status(200).json({
      success: true,
      data: {
        tasks: sortedTasks,
      },
    });
  } catch (error) {
    console.error("Error fetching today schedule:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { userId } = req.body; // from auth middleware
    const { month, year } = req.query;

    // Validate query params
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "month and year are required query parameters",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year",
      });
    }

    // First and last day of the requested month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // day 0 of next month = last day of current

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        status: true,
        punchIn: true,
        punchOut: true,
        lateDuration: true,
        overtimeDuration: true,
        isManualEntry: true,
        // workType: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Build a map of date string -> attendance record
    // So frontend can easily look up any day
    const attendanceMap = {};
    attendanceRecords.forEach((record) => {
      const dateKey = record.date.toISOString().split("T")[0]; // "2026-03-01"
      attendanceMap[dateKey] = {
        status: record.status,
        punchIn: record.punchIn,
        punchOut: record.punchOut,
        lateDuration: record.lateDuration,
        overtimeDuration: record.overtimeDuration,
        isManualEntry: record.isManualEntry,
      };
    });

    // Build summary counts for the month
    const summary = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      ON_LEAVE: 0,
      MISSED_PUNCH: 0,
    };

    attendanceRecords.forEach((record) => {
      if (summary[record.status] !== undefined) {
        summary[record.status]++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        summary,
        attendance: attendanceMap,
      },
    });
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { userId } = req.body; // from auth middleware
    const { notificationId } = req.params;

    // Check if this notification recipient record actually exists for this user
    const existing = await prisma.notificationRecipient.findUnique({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Notification not found for this user",
      });
    }

    // If already read, just return the existing record — no need to update
    if (existing.isRead) {
      return res.status(200).json({
        success: true,
        message: "Notification already marked as read",
        data: {
          notificationId,
          isRead: existing.isRead,
          readAt: existing.readAt,
        },
      });
    }

    const readAt = new Date();

    const updated = await prisma.notificationRecipient.update({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      data: {
        isRead: true,
        readAt,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        notificationId: updated.notificationId,
        isRead: updated.isRead,
        readAt: updated.readAt,
      },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
