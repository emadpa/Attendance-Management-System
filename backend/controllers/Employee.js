const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const cloudinary = require("cloudinary").v2;
require("../configs/cloudinary");

const axios = require("axios");
const FormData = require("form-data");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { v4: uuidv4 } = require("uuid");
const { startOfDay } = require("date-fns");

const { transporter } = require("../configs/mail");

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
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

const otpStore = new Map();

exports.getProfile = async function (req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        empId: true,
        name: true,
        email: true,
        dob: true,
        gender: true,
        mobileNumber: true,
        address: true,
        city: true,
        state: true,
        pinCode: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        designation: true,
        dateOfJoining: true,
        isBiometricRegistered: true,
        isActive: true,
        avatarUrl: true, // add this column to User if you want avatar support
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error("[getProfile]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile." });
  }
};

exports.updatePersonal = async function (req, res) {
  try {
    const userId = req.user.id;
    const {
      mobileNumber,
      gender,
      dob,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      address,
      city,
      state,
      pinCode,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────
    if (
      mobileNumber !== undefined &&
      mobileNumber !== null &&
      mobileNumber !== ""
    ) {
      const digits = mobileNumber.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        return res.status(400).json({
          success: false,
          message: "Invalid mobile number. Must be 10–15 digits.",
        });
      }
    }

    // ── Build update payload — only include fields that were sent ──
    const data = {};

    if (mobileNumber !== undefined) data.mobileNumber = mobileNumber || null;
    if (gender !== undefined) data.gender = gender || null;
    if (dob !== undefined) data.dob = new Date(dob) || null;
    if (address !== undefined) data.address = address || null;
    if (city !== undefined) data.city = city || null;
    if (state !== undefined) data.state = state || null;
    if (pinCode !== undefined) data.pinCode = pinCode || null;
    if (emergencyContactName !== undefined)
      data.emergencyContactName = emergencyContactName || null;
    if (emergencyContactPhone !== undefined)
      data.emergencyContactPhone = emergencyContactPhone || null;
    if (emergencyContactRelation !== undefined)
      data.emergencyContactRelation = emergencyContactRelation || null;

    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields provided to update." });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        mobileNumber: true,
        gender: true,
        dob: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        address: true,
        city: true,
        state: true,
        pinCode: true,
      },
    });

    return res.json({
      success: true,
      message: "Personal information updated.",
      data: updated,
    });
  } catch (err) {
    console.error("[updatePersonal]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update personal information.",
    });
  }
};

exports.changePassword = async function (req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Both fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    const passwordRequirements = {
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecialChar: /[^A-Za-z0-9]/.test(newPassword),
    };

    if (!passwordRequirements.hasUpperCase) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one uppercase letter",
      });
    }

    if (!passwordRequirements.hasNumber) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one number",
      });
    }

    if (!passwordRequirements.hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one special character",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    }

    // Prevent reuse
    const same = await bcrypt.compare(newPassword, user.password);
    if (same) {
      return res.status(400).json({
        success: false,
        message: "New password must differ from current password.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return res.json({ success: true, message: "Password updated." });
  } catch (err) {
    console.error("[changePassword]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update password." });
  }
};

exports.verifyPassword = async function (req, res) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ status: "fail", message: "Password is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return res
        .status(400)
        .json({ status: "fail", message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        status: "fail",
        message: "Incorrect password, Please try again..",
      });
    }

    return res
      .status(200)
      .json({ status: "success", message: "Password verified." });
  } catch (error) {
    console.log("Verification error:", error);

    return res
      .status(500)
      .json({ status: "fail", message: "Internal server error" });
  }
};

exports.sendEmailOtp = async function (req, res) {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email address." });
    }

    // Check new email isn't already taken
    const existing = await prisma.user.findFirst({
      where: { email: newEmail, NOT: { id: userId } },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email is already in use." });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (currentUser?.email?.toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "New email must differ from your current one",
      });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(userId, { otp, newEmail, expiresAt });

    await transporter.sendMail({
      from: `Attendance Management System <${process.env.EMAIL_USER}>`,
      to: newEmail,
      subject: "Verify your new email address",
      html: `
        <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Verify your new email</h2>
          <p style="font-size:13px;color:#64748b;margin:0 0 24px;">
            Use the code below to confirm this email address for your account.
            It expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;padding:16px 32px;background:#fff;border:2px solid #e2e8f0;border-radius:12px;font-size:32px;font-weight:900;letter-spacing:10px;color:#6366f1;">
              ${otp}
            </span>
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:0;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.json({ success: true, message: "OTP sent." });
  } catch (err) {
    console.error("[sendEmailOtp]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send verification code." });
  }
};

exports.verifyEmailOtp = async function (req, res) {
  try {
    const userId = req.user.id;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields." });
    }

    const record = otpStore.get(userId);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No pending OTP. Please request a new code.",
      });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(userId);
      return res.status(400).json({
        success: false,
        message: "Code expired. Please request a new one.",
      });
    }
    if (record.newEmail !== newEmail || record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Invalid code." });
    }

    // OTP valid — update email
    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    otpStore.delete(userId);

    return res.json({ success: true, message: "Email updated." });
  } catch (err) {
    console.error("[verifyEmailOtp]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update email." });
  }
};

// ── POST /api/employee/profile/avatar ─────────────────────────────
// multipart/form-data: avatar (file)
// Saves avatar URL after upload. Assumes multer + cloud storage middleware
// sets req.file.location (e.g. S3) or req.file.path (local).

// exports.uploadAvatar = async function (req, res) {
//   try {
//     const userId = req.user.id;

//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded." });
//     }

//     // Adapt this to your storage: S3 → req.file.location, local → build a URL
//     const avatarUrl =
//       req.file.location || `/uploads/avatars/${req.file.filename}`;

//     await prisma.user.update({
//       where: { id: userId },
//       data: { avatarUrl },
//     });

//     return res.json({ success: true, data: { avatarUrl } });
//   } catch (err) {
//     console.error("[uploadAvatar]", err);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to save avatar." });
//   }
// };

// Upload buffer → Cloudinary (returns a Promise)
function uploadToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function getPublicId(url) {
  if (!url) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
  return match ? match[1] : null;
}

// ── POST /api/employee/profile/avatar ─────────────────────────────
exports.uploadAvatar = async function (req, res) {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select an image.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Delete old avatar from Cloudinary if it exists
    if (user.avatarUrl) {
      const oldPublicId = getPublicId(user.avatarUrl);
      if (oldPublicId) {
        await cloudinary.uploader
          .destroy(oldPublicId)
          .catch((err) =>
            console.warn(
              "[uploadAvatar] Failed to delete old avatar:",
              err.message,
            ),
          );
      }
    }

    // Upload new avatar from memory buffer
    // Use userId as public_id so each user always has exactly one file
    const result = await uploadToCloudinary(
      req.file.buffer,
      "avatars", // Cloudinary folder
      `user_${userId}`, // stable public_id — overwrites previous upload
    );

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
    });

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        avatarUrl: result.secure_url,
        width: result.width,
        height: result.height,
        size: result.bytes,
      },
    });
  } catch (error) {
    console.error("[uploadAvatar]", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload profile picture. Please try again.",
    });
  }
};

// ── DELETE /api/employee/profile/avatar ───────────────────────────
exports.deleteAvatar = async function (req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    if (!user.avatarUrl) {
      return res
        .status(400)
        .json({ success: false, message: "No profile picture to delete." });
    }

    const publicId = getPublicId(user.avatarUrl);
    if (publicId) {
      await cloudinary.uploader
        .destroy(publicId)
        .catch((err) =>
          console.warn(
            "[deleteAvatar] Cloudinary deletion failed:",
            err.message,
          ),
        );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return res.status(200).json({
      success: true,
      message: "Profile picture deleted successfully.",
    });
  } catch (error) {
    console.error("[deleteAvatar]", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile picture.",
    });
  }
};

// =================================================================
//  profileRoutes.js
//  Place in: src/routes/employee/profileRoutes.js
// =================================================================

/*
const express  = require("express");
const multer   = require("multer");
const router   = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getProfile,
  sendEmailOtp,
  verifyEmailOtp,
  changePassword,
  uploadAvatar,
} = require("../../controllers/employee/profileController");

// Avatar upload config — swap storage engine for S3/Cloudinary as needed
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/avatars/",
    filename: (req, file, cb) => {
      const ext = file.originalname.split(".").pop();
      cb(null, `${req.user.id}-${Date.now()}.${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
});

router.use(protect);



// POST /api/employee/profile/email/send-otp        → send OTP to new email
router.post("/email/send-otp",    sendEmailOtp);

// POST /api/employee/profile/email/verify-otp      → verify & apply new email
router.post("/email/verify-otp",  verifyEmailOtp);



// POST /api/employee/profile/avatar               → upload profile photo
router.post("/avatar", upload.single("avatar"), uploadAvatar);

module.exports = router;
*/

/*
  ── Mount in main employee router ──────────────────────────────
  
  const profileRoutes = require("./employee/profileRoutes");
  router.use("/profile", profileRoutes);

  Final routes:
    GET  /api/employee/profile
    POST /api/employee/profile/email/send-otp
    POST /api/employee/profile/email/verify-otp
    PUT  /api/employee/profile/password
    POST /api/employee/profile/avatar

  ── Prisma: add avatarUrl to User model ─────────────────────────
  
  model User {
    ...
    avatarUrl  String?   // add this line
    ...
  }

  Then: npx prisma migrate dev --name add_avatar_url

  ── Environment variables needed ────────────────────────────────

  SMTP_HOST=smtp.yourprovider.com
  SMTP_PORT=587
  SMTP_USER=your@email.com
  SMTP_PASS=yourpassword
  SMTP_FROM=noreply@yourcompany.com
  APP_NAME=HR Portal
*/
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

/* ────────────────────────────────────────────────────────────────────
   GET ATTENDANCE STATUS - for dashboard circular progress
   ──────────────────────────────────────────────────────────────────── */
exports.getAttendanceStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const currentYear = now.getFullYear();

    // Normalize today to midnight local time
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateLocal(today); // "YYYY-MM-DD"
    console.log("Today (local):", today, "Key:", todayKey);

    const yearStart = new Date(currentYear, 0, 1);
    yearStart.setHours(0, 0, 0, 0);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    /* ── user ─────────────────────────────────────────────────── */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfJoining: true, organizationId: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const joiningDate = new Date(user.dateOfJoining);
    joiningDate.setHours(0, 0, 0, 0);

    // Start counting from whichever is later: joining date or Jan 1
    const startDate = joiningDate > yearStart ? joiningDate : yearStart;

    /* ── attendance records ───────────────────────────────────── */
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: yearEnd },
      },
      orderBy: { date: "desc" },
    });

    /* ── holidays (only weekday holidays count against working days) ── */
    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: user.organizationId,
        date: { gte: startDate, lte: today },
      },
    });

    // Only subtract holidays that fall on weekdays
    const weekdayHolidayCount = holidays.filter((h) => {
      const day = new Date(h.date).getDay();
      return day !== 0 && day !== 6;
    }).length;

    // Build a Set of holiday date keys for O(1) lookup
    const holidayKeys = new Set(
      holidays.map((h) => h.date.toISOString().split("T")[0]),
    );

    /* ── count working days (weekdays from startDate up to today) ── */
    let totalWorkingDays = 0;
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalWorkingDays++;
    }
    totalWorkingDays -= weekdayHolidayCount;

    /* ── present days: PRESENT + LATE both count as attended ─────── */
    const presentDays = attendanceRecords.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE",
    ).length;

    const percentage =
      totalWorkingDays > 0
        ? Math.round((presentDays / totalWorkingDays) * 100)
        : 0;

    /* ── today's attendance record ────────────────────────────── */

    const todayUTC = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    console.log("Today (UTC):", todayUTC);

    const todayAttendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: todayUTC } },
    });

    /* ── today's leave (use normalized midnight dates) ────────── */
    const todayLeave = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    /* ── today's status ───────────────────────────────────────────
       Priority:
         1. DB attendance record (source of truth)
         2. Approved leave
         3. Holiday
         4. Weekend
         5. Still within today → N/A  (do not mark absent yet)
    ─────────────────────────────────────────────────────────── */
    let status;
    if (todayAttendance?.status) {
      status = todayAttendance.status;
    } else if (todayLeave) {
      status = "ON_LEAVE";
    } else if (holidayKeys.has(todayKey)) {
      status = "HOLIDAY";
    } else if (now.getDay() === 0 || now.getDay() === 6) {
      status = "WEEKEND";
    } else {
      // Weekday with no record yet — don't mark absent, day isn't over
      status = "N/A";
    }

    return res.status(200).json({
      success: true,
      data: {
        percentage,
        presentDays,
        totalDays: totalWorkingDays,
        todayPunchIn: todayAttendance?.punchIn || null,
        todayPunchOut: todayAttendance?.punchOut || null,
        status,
        todayLeave: todayLeave
          ? {
              name: todayLeave.leaveType?.name,
              isPaid: todayLeave.leaveType?.isPaid,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[getAttendanceStatus]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10);
    const month = parseInt(req.query.month ?? new Date().getMonth() + 1, 10); // 1–12

    /* ── date boundaries ─────────────────────────────────────── */
    const startDate = new Date(year, month - 1, 1);

    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateLocal(today);

    // Never report beyond today
    const reportEnd = endDate < today ? endDate : new Date(today);
    reportEnd.setHours(23, 59, 59, 999);

    /* ── user ────────────────────────────────────────────────── */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        dateOfJoining: true,
        organizationId: true,
        shift: { select: { name: true, startTime: true, endTime: true } },
      },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const joiningDate = new Date(user.dateOfJoining);
    joiningDate.setHours(0, 0, 0, 0);

    const effectiveStart =
      startDate < joiningDate ? new Date(joiningDate) : new Date(startDate);

    if (effectiveStart > reportEnd) {
      return res.status(200).json({
        success: true,
        data: emptyReport(year, month, startDate, user),
      });
    }

    /* ── attendance records ───────────────────────────────────── */
    const records = await prisma.attendance.findMany({
      where: { userId, date: { gte: effectiveStart, lte: reportEnd } },
      select: {
        date: true,
        punchIn: true,
        punchOut: true,
        status: true,
        lateDuration: true,
        overtimeDuration: true,
      },
      orderBy: { date: "asc" },
    });
    const recordMap = {};
    records.forEach((r) => {
      recordMap[formatDateLocal(r.date)] = r;
    });

    /* ── holidays ────────────────────────────────────────────── */
    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: user.organizationId,
        date: { gte: effectiveStart, lte: reportEnd },
      },
      select: { date: true, name: true },
    });
    const holidayMap = {};
    holidays.forEach((h) => {
      holidayMap[formatDateLocal(h.date)] = h.name;
    });

    const weekdayHolidayCount = holidays.filter((h) => {
      const d = new Date(h.date).getDay();
      return d !== 0 && d !== 6;
    }).length;

    /* ── approved leaves ─────────────────────────────────────── */
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: reportEnd },
        endDate: { gte: effectiveStart },
      },
      select: {
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true, isPaid: true } },
      },
    });
    const leaveMap = {};
    leaveRequests.forEach((lr) => {
      const s = new Date(lr.startDate),
        e = new Date(lr.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        leaveMap[d.toISOString().split("T")[0]] = {
          name: lr.leaveType?.name ?? "Leave",
          isPaid: lr.leaveType?.isPaid ?? false,
        };
      }
    });

    /* ── leave balances ──────────────────────────────────────── */
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { userId },
      select: {
        allowed: true,
        used: true,
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    /* ── build daily data ─────────────────────────────────────── */
    let totalWorkingDays = 0,
      presentDays = 0,
      absentDays = 0,
      lateDays = 0,
      leaveDays = 0;
    let totalLateMinutes = 0,
      totalOvertimeMinutes = 0,
      totalWorkedMinutes = 0,
      workedCount = 0;

    const dailyRecords = [];
    const trend = [];

    const fmtTime = (iso) => {
      if (!iso) return null;
      return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    for (
      let d = new Date(effectiveStart);
      d <= reportEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = formatDateLocal(d);

      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;

      const isHoliday = !!holidayMap[dateKey];

      const isToday = dateKey === todayKey;
      const rec = recordMap[dateKey] ?? null;

      const leaveInfo = leaveMap[dateKey] ?? null;

      if (!isWeekend && !isHoliday) totalWorkingDays++;

      let status;
      if (rec?.status) status = rec.status;
      else if (leaveInfo) status = "ON_LEAVE";
      else if (isHoliday) status = "HOLIDAY";
      else if (isWeekend) status = "WEEKEND";
      else if (isToday) status = "N/A";
      else status = "ABSENT";

      let hoursWorked = 0;
      if (rec?.punchIn && rec?.punchOut) {
        hoursWorked =
          (new Date(rec.punchOut) - new Date(rec.punchIn)) / 3600000;
        totalWorkedMinutes += hoursWorked * 60;
        workedCount++;
      }

      if (status === "PRESENT" || status === "LATE") {
        presentDays++;
        if (rec.lateDuration > 0) {
          lateDays++;
          totalLateMinutes += rec.lateDuration;
        }
        totalOvertimeMinutes += rec?.overtimeDuration ?? 0;
      } else if (status === "ABSENT") {
        absentDays++;
      } else if (status === "ON_LEAVE") {
        leaveDays++;
      }

      const hh = Math.floor(hoursWorked);
      const mm = Math.round((hoursWorked % 1) * 60);

      dailyRecords.push({
        date: d.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        dateRaw: dateKey,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        status,
        punchIn: fmtTime(rec?.punchIn),
        punchOut: fmtTime(rec?.punchOut),
        hoursWorked: hoursWorked > 0 ? `${hh}h ${mm}m` : null,
        hoursWorkedDecimal: parseFloat(hoursWorked.toFixed(2)),
        lateDuration: rec?.lateDuration ?? 0,
        overtimeDuration: rec?.overtimeDuration ?? 0,
        isWeekend,
        isHoliday,
        holidayName: holidayMap[dateKey] ?? null,
        leaveInfo,
      });

      if (!isWeekend) {
        trend.push({
          dayLabel: d.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          }),
          status,
          hoursWorked: parseFloat(hoursWorked.toFixed(1)),
          lateDuration: rec?.lateDuration ?? 0,
          overtimeDuration: rec?.overtimeDuration ?? 0,
        });
      }
    }

    const attendanceRate =
      totalWorkingDays > 0
        ? Math.round((presentDays / totalWorkingDays) * 100)
        : 0;
    const avgDailyHours =
      workedCount > 0
        ? parseFloat((totalWorkedMinutes / workedCount / 60).toFixed(1))
        : 0;
    const shiftHours = (() => {
      const s = user.shift ?? { startTime: "09:00", endTime: "17:00" };
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      return parseFloat((eh + em / 60 - (sh + sm / 60)).toFixed(1));
    })();

    const minsToLabel = (m) => {
      if (!m) return "0m";
      const h = Math.floor(m / 60),
        r = m % 60;
      return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
    };

    return res.status(200).json({
      success: true,
      data: {
        year,
        month,
        monthLabel: startDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        userName: user.name,
        shift: user.shift ?? {
          name: "Default",
          startTime: "09:00",
          endTime: "17:00",
        },
        summary: {
          attendanceRate,
          presentDays,
          absentDays,
          lateDays,
          leaveDays,
          totalDays: totalWorkingDays,
          totalOvertimeMinutes,
          totalLateMinutes,
          totalOvertimeLabel: minsToLabel(totalOvertimeMinutes),
          totalLateLabel: minsToLabel(totalLateMinutes),
          avgDailyHours,
          shiftHours,
        },
        records: dailyRecords,
        breakdown: [
          { label: "Present", value: presentDays, color: "#6366f1" },
          { label: "Absent", value: absentDays, color: "#ef4444" },
          { label: "Late", value: lateDays, color: "#f97316" },
          { label: "On Leave", value: leaveDays, color: "#06b6d4" },
          { label: "Holiday", value: weekdayHolidayCount, color: "#10b981" },
        ].filter((b) => b.value > 0),
        trend,
        leaveBalances: leaveBalances.map((b) => ({
          name: b.leaveType?.name ?? "Leave",
          isPaid: b.leaveType?.isPaid ?? false,
          allowed: b.allowed,
          used: b.used,
          remaining: b.allowed - b.used,
        })),
      },
    });
  } catch (error) {
    console.error("[getAttendanceReport]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

function emptyReport(year, month, startDate, user) {
  return {
    year,
    month,
    monthLabel: startDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    userName: user.name,
    shift: user.shift ?? {
      name: "Default",
      startTime: "09:00",
      endTime: "17:00",
    },
    summary: {
      attendanceRate: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      totalDays: 0,
      totalOvertimeMinutes: 0,
      totalLateMinutes: 0,
      totalOvertimeLabel: "0m",
      totalLateLabel: "0m",
      avgDailyHours: 0,
      shiftHours: 8,
    },
    records: [],
    breakdown: [],
    trend: [],
    leaveBalances: [],
  };
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// GET /employee/dashboard
exports.getDashboard = async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      empId: true,
      organizationId: true,
      organization: { select: { name: true } },
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
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const attendanceSummary = await prisma.attendance.findMany({
    where: {
      userId,
      date: {
        gte: new Date(`${new Date().getFullYear()}-01-01`),
        lte: endOfToday,
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

function toLocalDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

//Schedule controllers

exports.getTodaySchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const localDate = toLocalDateStr(new Date());

    const schedule = await prisma.schedule.findUnique({
      where: { userId_date: { userId, date: new Date(localDate) } },
      select: {
        id: true,
        workType: true,
        startTime: true,
        endTime: true,
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

    const sortedTasks = Array.isArray(schedule.tasks)
      ? schedule.tasks.sort((a, b) =>
          a.time && b.time ? a.time.localeCompare(b.time) : 0,
        )
      : [];

    return res.status(200).json({
      success: true,
      data: { ...schedule, tasks: sortedTasks },
    });
  } catch (error) {
    console.error("[getTodaySchedule]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getMonthlySchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const year = parseInt(req.query.year ?? now.getFullYear(), 10);
    const month = parseInt(req.query.month ?? now.getMonth() + 1, 10); // 1-based

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid year or month" });
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999); // last day

    const schedules = await prisma.schedule.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        date: true,
        workType: true,
        startTime: true,
        endTime: true,
        tasks: true,
      },
      orderBy: { date: "asc" },
    });

    /* Build "YYYY-MM-DD" → schedule map */
    const scheduleMap = {};
    schedules.forEach((s) => {
      const key = toLocalDateStr(s.date);
      const sortedTasks = Array.isArray(s.tasks)
        ? s.tasks.sort((a, b) =>
            a.time && b.time ? a.time.localeCompare(b.time) : 0,
          )
        : [];
      scheduleMap[key] = {
        id: s.id,
        workType: s.workType,
        startTime: s.startTime,
        endTime: s.endTime,
        tasks: sortedTasks,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        year,
        month,
        schedules: scheduleMap,
      },
    });
  } catch (error) {
    console.error("[getMonthlySchedule]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.createOrUpdateSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organizationId;

    const {
      date,
      workType,
      startTime,
      endTime,
      tasks: rawTasks = [],
    } = req.body;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "date is required (YYYY-MM-DD)" });
    }
    if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "tasks array must have at least one item",
      });
    }

    /* Stamp every new task with a uuid */
    const newTasks = rawTasks.map((t) => ({
      id: uuidv4(),
      time: t.time ?? null,
      title: t.title ?? "Untitled",
      duration: t.duration ?? null,
      description: t.description ?? null,
    }));

    const scheduleDate = new Date(date);

    /* Upsert: create if not exists, otherwise merge tasks */
    const existing = await prisma.schedule.findUnique({
      where: { userId_date: { userId, date: scheduleDate } },
      select: { tasks: true },
    });

    let schedule;

    if (existing) {
      /* Append new tasks to existing ones */
      const mergedTasks = [
        ...(Array.isArray(existing.tasks) ? existing.tasks : []),
        ...newTasks,
      ];

      schedule = await prisma.schedule.update({
        where: { userId_date: { userId, date: scheduleDate } },
        data: {
          ...(workType && { workType }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          tasks: mergedTasks,
        },
      });
    } else {
      schedule = await prisma.schedule.create({
        data: {
          userId,
          organizationId,
          date: scheduleDate,
          workType: workType ?? "OFFICE",
          startTime: startTime ?? null,
          endTime: endTime ?? null,
          tasks: newTasks,
        },
      });
    }

    const sortedTasks = Array.isArray(schedule.tasks)
      ? schedule.tasks.sort((a, b) =>
          a.time && b.time ? a.time.localeCompare(b.time) : 0,
        )
      : [];

    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? "Tasks added to existing schedule"
        : "Schedule created",
      data: { ...schedule, tasks: sortedTasks },
    });
  } catch (error) {
    console.error("[createOrUpdateSchedule]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, taskId } = req.params;

    if (!date || !taskId) {
      return res
        .status(400)
        .json({ success: false, message: "date and taskId are required" });
    }

    const schedule = await prisma.schedule.findUnique({
      where: { userId_date: { userId, date: new Date(date) } },
      select: { tasks: true },
    });

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "No schedule found for this date" });
    }

    const tasks = Array.isArray(schedule.tasks) ? schedule.tasks : [];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    /* Merge only the fields that were sent */
    const { time, title, duration, description } = req.body;
    const updatedTask = {
      ...tasks[taskIndex],
      ...(time !== undefined && { time }),
      ...(title !== undefined && { title }),
      ...(duration !== undefined && { duration }),
      ...(description !== undefined && { description }),
    };

    tasks[taskIndex] = updatedTask;

    const updatedSchedule = await prisma.schedule.update({
      where: { userId_date: { userId, date: new Date(date) } },
      data: { tasks },
    });

    const sortedTasks = Array.isArray(updatedSchedule.tasks)
      ? updatedSchedule.tasks.sort((a, b) =>
          a.time && b.time ? a.time.localeCompare(b.time) : 0,
        )
      : [];

    return res.status(200).json({
      success: true,
      message: "Task updated",
      data: { ...updatedSchedule, tasks: sortedTasks },
    });
  } catch (error) {
    console.error("[updateTask]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, taskId } = req.params;

    if (!date || !taskId) {
      return res
        .status(400)
        .json({ success: false, message: "date and taskId are required" });
    }

    const schedule = await prisma.schedule.findUnique({
      where: { userId_date: { userId, date: new Date(date) } },
      select: { tasks: true },
    });

    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: "No schedule found for this date" });
    }

    const tasks = Array.isArray(schedule.tasks) ? schedule.tasks : [];
    const filteredTasks = tasks.filter((t) => t.id !== taskId);

    if (filteredTasks.length === tasks.length) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    /* If no tasks remain, delete the whole schedule row */
    if (filteredTasks.length === 0) {
      await prisma.schedule.delete({
        where: { userId_date: { userId, date: new Date(date) } },
      });

      return res.status(200).json({
        success: true,
        message: "Task deleted — schedule removed (no tasks remaining)",
        data: null,
      });
    }

    /* Otherwise update with the remaining tasks */
    const updatedSchedule = await prisma.schedule.update({
      where: { userId_date: { userId, date: new Date(date) } },
      data: { tasks: filteredTasks },
    });

    const sortedTasks = Array.isArray(updatedSchedule.tasks)
      ? updatedSchedule.tasks.sort((a, b) =>
          a.time && b.time ? a.time.localeCompare(b.time) : 0,
        )
      : [];

    return res.status(200).json({
      success: true,
      message: "Task deleted",
      data: { ...updatedSchedule, tasks: sortedTasks },
    });
  } catch (error) {
    console.error("[deleteTask]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
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

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Get user's org and department
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, departmentId: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Step 2: Fetch all unread notifications targeted to this user
    const recipients = await prisma.notificationRecipient.findMany({
      where: {
        userId,
        isRead: false,
      },
      include: {
        notification: {
          include: {
            sender: { select: { name: true } },
          },
        },
      },
      orderBy: {
        notification: { createdAt: "desc" },
      },
    });

    // Step 3: Filter out drafts and map to clean response
    const notifications = recipients
      .filter((r) => !r.notification.isDraft)
      .map((r) => ({
        id: r.notification.id,
        title: r.notification.title,
        message: r.notification.message,
        senderName: r.notification.sender.name,
        createdAt: r.notification.createdAt,
        isRead: r.isRead,
      }));

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

const GEO_RADIUS_METERS = 500; // allowed radius from office

// Haversine formula — distance in meters between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;
    const frames = req.files; // multer array: req.files

    // ── Validate inputs ──────────────────────────────────────────────
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location is required.",
        gatePassed: 0,
      });
    }
    if (!frames || frames.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Not enough frames captured.",
        gatePassed: 0,
      });
    }

    console.log(userId);
    // ── Fetch user + org location + face embedding ───────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        faceEmbedding: true,
        isBiometricRegistered: true,
        organization: {
          select: { latitude: true, longitude: true },
        },
      },
    });
    console.log(user);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found.", gatePassed: 0 });
    }
    if (!user.isBiometricRegistered || !user.faceEmbedding) {
      return res.status(400).json({
        success: false,
        message: "Biometric not registered.",
        gatePassed: 0,
      });
    }

    // ── GATE 1: Geofence check (Express handles this) ────────────────
    const orgLat = user.organization?.latitude;
    const orgLng = user.organization?.longitude;
    console.log("Org location:", orgLat, orgLng);

    if (!orgLat || !orgLng) {
      return res.status(500).json({
        success: false,
        message: "Office location not configured.",
        gatePassed: 0,
      });
    }

    const distanceFromOffice = haversineDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      orgLat,
      orgLng,
    );

    const isGeofenceValid = distanceFromOffice <= GEO_RADIUS_METERS;
    if (!isGeofenceValid) {
      return res.status(200).json({
        success: false,
        message: `You are ${Math.round(distanceFromOffice)}m away from the office. Must be within ${GEO_RADIUS_METERS}m.`,
        gatePassed: 0,
      });
    }

    // ── GATE 2 & 3: Forward frames + embedding to FastAPI ────────────
    const form = new FormData();

    // Append all frames
    for (const file of frames) {
      form.append("files", file.buffer, {
        filename: file.originalname,
        contentType: "image/jpeg",
      });
    }

    // FastAPI /api/attendance/mark also needs user_id but uses local DB
    // We bypass that — we send the stored embedding directly as JSON
    // So we call a slightly different flow: liveness + verify separately
    // Since FastAPI's /api/attendance/mark uses its own DB, we send the
    // embedding via a custom endpoint. If your FastAPI only has /api/attendance/mark,
    // append user_id and also send the embedding as a JSON field below.
    // form.append("user_id", userId);

    // Send stored embedding as JSON string so FastAPI can use it directly
    // (Your FastAPI will need to accept this — see note at bottom of file)
    form.append(
      "stored_embedding_json",
      JSON.stringify(Array.from(user.faceEmbedding)),
    );
    // console.log(form);
    // console.log(form);

    let pythonResult;
    try {
      const pythonRes = await axios.post(
        `${PYTHON_SERVICE_URL}/api/attendance/mark`,
        form,
        { headers: form.getHeaders(), timeout: 15000 },
      );
      pythonResult = pythonRes.data;
    } catch (pyErr) {
      console.error("FastAPI error:", pyErr.message);
      return res.status(502).json({
        success: false,
        message: "Biometric service unavailable. Try again.",
        gatePassed: 1, // geo passed, biometric service failed
      });
    }

    // ── GATE 2: Liveness failed ───────────────────────────────────────
    if (
      !pythonResult.verified &&
      pythonResult.message?.toLowerCase().includes("liveness")
    ) {
      return res.status(200).json({
        success: false,
        message: pythonResult.message,
        gatePassed: 1,
      });
    }

    // ── GATE 3: Face match failed ─────────────────────────────────────
    if (!pythonResult.verified) {
      return res.status(200).json({
        success: false,
        message:
          pythonResult.message || "Face did not match. Please try again.",
        gatePassed: 2,
      });
    }

    // ── All gates passed — save attendance record ─────────────────────
    const today = new Date();
    const todayDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    // const todayDate = new Date().toISOString().split("T")[0];

    const punchInTime = new Date();
    const confidence = parseFloat(pythonResult.confidence) || null;

    // Upsert: if already punched in today, update punchOut instead
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date: todayDate } },
    });

    if (existing) {
      // Already punched in — this is a punch out
      await prisma.attendance.update({
        where: { userId_date: { userId, date: todayDate } },
        data: {
          punchOut: punchInTime,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          isGeofenceValid: true,
          faceMatchScore: confidence,
          isLivenessVerified: true,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Punch-out recorded successfully.",
        confidence: pythonResult.confidence,
        type: "PUNCH_OUT",
        gatePassed: 3,
      });
    }

    // First punch of the day — determine if PRESENT or LATE
    // You can add shift logic here if needed; defaulting to PRESENT
    await prisma.attendance.create({
      data: {
        userId,
        organizationId: user.organizationId,
        date: todayDate,
        punchIn: punchInTime,
        status: "PRESENT",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isGeofenceValid: true,
        faceMatchScore: confidence,
        isLivenessVerified: true,
        spoofAttemptDetected: false,
        isManualEntry: false,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully.",
      confidence: pythonResult.confidence,
      type: "PUNCH_IN",
      gatePassed: 3,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      gatePassed: 0,
    });
  }
};

//LEAVES

exports.getLeaveSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organizationId;

    // 1. All leave types for this org
    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    });

    // 2. Employee's leave balances (joined with leaveType for name/isPaid)
    const balances = await prisma.leaveBalance.findMany({
      where: { userId },
      include: {
        leaveType: {
          select: { name: true, isPaid: true, defaultAllowed: true },
        },
      },
    });

    // 3. Build a merged balance array:
    //    For leave types that have no LeaveBalance row yet, use defaultAllowed with 0 used
    const balanceMap = {};
    balances.forEach((b) => {
      balanceMap[b.leaveTypeId] = b;
    });

    const mergedBalances = leaveTypes.map((lt) => {
      const bal = balanceMap[lt.id];
      return {
        leaveTypeId: lt.id,
        name: lt.name,
        isPaid: lt.isPaid,
        allowed: bal ? bal.allowed : lt.defaultAllowed,
        used: bal ? bal.used : 0,
        remaining:
          (bal ? bal.allowed : lt.defaultAllowed) - (bal ? bal.used : 0),
      };
    });

    // 4. Leave request history for this employee
    const requests = await prisma.leaveRequest.findMany({
      where: { userId },
      include: {
        leaveType: { select: { name: true, isPaid: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ balances: mergedBalances, leaveTypes, requests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch leave data" });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const userId = req.user.id;
    const orgId = req.user.organizationId;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({ error: "Start date cannot be after end date" });
    }

    // Check for overlapping leave requests
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) },
          },
        ],
      },
    });

    if (overlap) {
      return res.status(400).json({
        error: "You already have a leave request overlapping these dates",
      });
    }

    // Check balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId: { userId, leaveTypeId } },
      include: { leaveType: true },
    });

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType)
      return res.status(400).json({ error: "Invalid leave type" });

    const allowed = balance ? balance.allowed : leaveType.defaultAllowed;
    const used = balance ? balance.used : 0;
    const remaining = allowed - used;

    const days =
      Math.ceil(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
      ) + 1;

    if (allowed > 0 && days > remaining) {
      return res.status(400).json({
        error: `Insufficient balance. You have ${remaining} day(s) remaining for ${leaveType.name}.`,
      });
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        organizationId: orgId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: "PENDING",
      },
      include: {
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    return res.status(201).json(newRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to submit leave request" });
  }
};

exports.deleteLeaveRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const request = await prisma.leaveRequest.findUnique({
      where: { id: req.params.leaveId },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.userId !== userId)
      return res.status(403).json({ error: "Unauthorized" });
    if (request.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: "Only pending requests can be cancelled" });
    }

    await prisma.leaveRequest.update({
      where: { id: req.params.leaveId },
      data: { status: "CANCELLED" },
    });

    return res.json({ message: "Leave request cancelled successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to cancel leave request" });
  }
};

/**
 * GET /api/employee/attendance/timeline
 * Query params:
 *   weekOffset  — integer, 0 = current week, -1 = last week, etc.
 *   userId      — target employee id (falls back to req.user.id)
 */

// function formatDateLocal(date) {
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");
//   return `${year}-${month}-${day}`;
// }
exports.getAttendanceTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const weekOffset = parseInt(req.query.weekOffset ?? "0", 10);

    /* ── fetch user + shift ─────────────────────────────────────── */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        dateOfJoining: true,
        organizationId: true,
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    /* ── calculate week boundaries (Sun–Sat) ────────────────────── */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateLocal(today);

    // Sunday of the current week
    const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - dayOfWeek);

    // Apply offset (in weeks)
    const weekStart = new Date(currentSunday);
    weekStart.setDate(currentSunday.getDate() + weekOffset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999);

    const joiningDate = new Date(user.dateOfJoining);
    joiningDate.setHours(0, 0, 0, 0);

    // Sunday of joining week
    const joiningWeekSunday = new Date(joiningDate);
    joiningWeekSunday.setDate(joiningDate.getDate() - joiningDate.getDay());

    const isAtJoiningWeek = weekStart <= joiningWeekSunday;
    const isAtCurrentWeek = weekOffset >= 0;

    /* ── fetch attendance records ───────────────────────────────── */
    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: {
        date: true,
        punchIn: true,
        punchOut: true,
        status: true,
        lateDuration: true,
        overtimeDuration: true,
      },
    });

    const recordMap = {};
    records.forEach((r) => {
      const key = r.date.toISOString().split("T")[0];
      recordMap[key] = r;
    });

    /* ── fetch holidays for this week ───────────────────────────── */
    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: user.organizationId,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: { date: true, name: true },
    });

    const holidayMap = {};
    holidays.forEach((h) => {
      const key = h.date.toISOString().split("T")[0];
      holidayMap[key] = h.name;
    });

    /* ── fetch approved leave requests covering this week ────────── */
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
      select: {
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    // Build a map of date -> leave info
    const leaveMap = {};
    leaveRequests.forEach((lr) => {
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = formatDateLocal(d);
        leaveMap[key] = {
          name: lr.leaveType?.name ?? "Leave",
          isPaid: lr.leaveType?.isPaid ?? false,
        };
      }
    });

    /* ── build the 7-day array (Sun–Sat) ────────────────────────── */
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateKey = formatDateLocal(d);
      const rec = recordMap[dateKey] || null;

      const isBeforeJoining = d < joiningDate;
      const isFuture = d > today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isHoliday = !!holidayMap[dateKey];
      const leaveInfo = leaveMap[dateKey] || null;
      const isToday = dateKey === todayKey;

      // Determine status
      let status;
      if (rec?.status) {
        status = rec.status;
      } else if (isFuture || isBeforeJoining) {
        status = "N/A";
      } else if (leaveInfo) {
        status = "ON_LEAVE";
      } else if (isHoliday) {
        status = "HOLIDAY";
      } else if (isWeekend) {
        status = "WEEKEND";
      } else if (isToday) {
        status = "N/A";
      } else {
        status = "ABSENT";
      }

      days.push({
        date: dateKey,
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        monthLabel: d.toLocaleDateString("en-US", { month: "short" }),
        isBeforeJoining,
        isFuture,
        isWeekend,
        isHoliday,
        holidayName: holidayMap[dateKey] || null,
        leaveInfo,
        punchIn: rec?.punchIn ?? null,
        punchOut: rec?.punchOut ?? null,
        status,
        lateDuration: rec?.lateDuration ?? 0,
        overtimeDuration: rec?.overtimeDuration ?? 0,
      });
    }

    /* ── shift ──────────────────────────────────────────────────── */
    const shift = user.shift ?? {
      name: "Default",
      startTime: "09:00",
      endTime: "17:00",
    };

    return res.status(200).json({
      success: true,
      data: {
        weekStart: formatDateLocal(weekStart),
        weekEnd: formatDateLocal(weekEnd),
        weekOffset,
        isAtJoiningWeek,
        isAtCurrentWeek,
        shift: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        },
        days,
      },
    });
  } catch (error) {
    console.error("[getAttendanceTimeline]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getWeeklyHours = async (req, res) => {
  try {
    const userId = req.user.id;
    const weekOffset = parseInt(req.query.weekOffset ?? "0", 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sunday of the current week
    const dayOfWeek = today.getDay();
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - dayOfWeek);

    const weekStart = new Date(currentSunday);
    weekStart.setDate(currentSunday.getDate() + weekOffset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dateOfJoining: true,
        shift: {
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const joiningDate = new Date(user.dateOfJoining);
    joiningDate.setHours(0, 0, 0, 0);

    // Sunday of joining week
    const joiningWeekSunday = new Date(joiningDate);
    joiningWeekSunday.setDate(joiningDate.getDate() - joiningDate.getDay());
    const isAtJoiningWeek = weekStart <= joiningWeekSunday;

    /* ── fetch attendance records for the week ──────────────────── */
    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
      select: {
        date: true,
        punchIn: true,
        punchOut: true,
        status: true,
      },
      orderBy: { date: "asc" },
    });

    const recordMap = {};
    records.forEach((r) => {
      const key = r.date.toISOString().split("T")[0];
      recordMap[key] = r;
    });

    /* ── calculate target hours from shift ──────────────────────── */
    let targetHours = 8; // default
    if (user.shift?.startTime && user.shift?.endTime) {
      const [startH, startM] = user.shift.startTime.split(":").map(Number);
      const [endH, endM] = user.shift.endTime.split(":").map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      targetHours = (endMinutes - startMinutes) / 60;
    }

    /* ── build the 7-day array (Mon–Sun) ────────────────────────── */
    const days = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateKey = formatDateLocal(d);
      const rec = recordMap[dateKey] || null;

      const isBeforeJoining = d < joiningDate;
      const isFuture = d > today;
      const isToday = formatDateLocal(d) === formatDateLocal(today);

      // Calculate hours worked
      let hours = 0;
      if (rec?.punchIn && rec?.punchOut) {
        const punchInTime = new Date(rec.punchIn);
        const punchOutTime = new Date(rec.punchOut);
        const diff = punchOutTime - punchInTime;
        hours = parseFloat((diff / (1000 * 60 * 60)).toFixed(1)); // Convert ms to hours
      }

      days.push({
        day: dayLabels[i],
        date: dateKey,
        hours: hours,
        isToday: isToday,
        isFuture: isFuture,
        isBeforeJoining: isBeforeJoining,
        status:
          rec?.status || (isFuture ? "N/A" : isBeforeJoining ? "N/A" : null),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        days,
        targetHours: parseFloat(targetHours.toFixed(1)),
        weekStart: formatDateLocal(weekStart),
        weekEnd: formatDateLocal(weekEnd),
        weekOffset,
        isAtJoiningWeek,
        isCurrentWeek: weekOffset === 0,
      },
    });
  } catch (error) {
    console.error("[getWeeklyHours]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const month = parseInt(req.query.month ?? now.getMonth() + 1, 10); // 1-based
    const year = parseInt(req.query.year ?? now.getFullYear(), 10);

    if (month < 1 || month > 12 || isNaN(month) || isNaN(year)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid month or year" });
    }

    /* ── fetch user + shift ─────────────────────────────────────── */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        dateOfJoining: true,
        organizationId: true,
        shift: {
          select: { id: true, name: true, startTime: true, endTime: true },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    /* ── month boundaries ───────────────────────────────────────── */
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = formatDateLocal(today);

    /* ── joining date guard ─────────────────────────────────────── */
    const joiningDate = new Date(user.dateOfJoining);
    joiningDate.setHours(0, 0, 0, 0);

    const joiningMonthStart = new Date(
      joiningDate.getFullYear(),
      joiningDate.getMonth(),
      1,
    );
    const thisMonthStart = new Date(year, month - 1, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const isAtJoiningMonth = thisMonthStart <= joiningMonthStart;
    const isAtCurrentMonth = thisMonthStart >= currentMonthStart;

    /* ── fetch attendance records ───────────────────────────────── */
    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        date: true,
        punchIn: true,
        punchOut: true,
        status: true,
        lateDuration: true,
        overtimeDuration: true,
      },
    });

    const recordMap = {};
    records.forEach((r) => {
      const key = r.date.toISOString().split("T")[0];
      recordMap[key] = r;
    });

    /* ── fetch holidays ─────────────────────────────────────────── */
    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: user.organizationId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { date: true, name: true },
    });

    const holidayMap = {};
    holidays.forEach((h) => {
      const key = h.date.toISOString().split("T")[0];
      holidayMap[key] = h.name;
    });

    /* ── fetch approved leaves ──────────────────────────────────── */
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: {
        startDate: true,
        endDate: true,
        leaveType: { select: { name: true, isPaid: true } },
      },
    });

    const leaveMap = {};
    leaveRequests.forEach((lr) => {
      const start = new Date(lr.startDate);
      const end = new Date(lr.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = formatDateLocal(d);
        leaveMap[key] = {
          name: lr.leaveType?.name ?? "Leave",
          isPaid: lr.leaveType?.isPaid ?? false,
        };
      }
    });

    /* ── build day array (all days in month) ────────────────────── */
    const totalDays = monthEnd.getDate();
    const days = [];

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(year, month - 1, i + 1);
      const dateKey = formatDateLocal(d);
      const rec = recordMap[dateKey] || null;

      const isBeforeJoining = d < joiningDate;
      const isFuture = d > today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isHoliday = !!holidayMap[dateKey];
      const leaveInfo = leaveMap[dateKey] || null;
      const isToday = dateKey === todayKey;

      let status;
      if (rec?.status) {
        status = rec.status;
      } else if (isFuture || isBeforeJoining) {
        status = "N/A";
      } else if (leaveInfo) {
        status = "ON_LEAVE";
      } else if (isHoliday) {
        status = "HOLIDAY";
      } else if (isWeekend) {
        status = "WEEKEND";
      } else if (isToday) {
        status = "N/A";
      } else {
        status = "ABSENT";
      }

      days.push({
        date: dateKey,
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        monthLabel: d.toLocaleDateString("en-US", { month: "short" }),
        isBeforeJoining,
        isFuture,
        isWeekend,
        isHoliday,
        holidayName: holidayMap[dateKey] || null,
        leaveInfo,
        punchIn: rec?.punchIn ?? null,
        punchOut: rec?.punchOut ?? null,
        status,
        lateDuration: rec?.lateDuration ?? 0,
        overtimeDuration: rec?.overtimeDuration ?? 0,
      });
    }

    /* ── shift fallback ─────────────────────────────────────────── */
    const shift = user.shift ?? {
      name: "Default",
      startTime: "09:00",
      endTime: "17:00",
    };

    /* ── monthly summary ────────────────────────────────────────── */
    const workingDays = days.filter(
      (d) => !d.isWeekend && !d.isHoliday && !d.isBeforeJoining && !d.isFuture,
    );
    const summary = {
      present: days.filter((d) => d.status === "PRESENT" || d.status === "LATE")
        .length,
      absent: days.filter((d) => d.status === "ABSENT").length,
      late: days.filter((d) => d.lateDuration > 0).length,
      onLeave: days.filter((d) => d.status === "ON_LEAVE").length,
      overtime: days.filter((d) => d.overtimeDuration > 0).length,
      holidays: days.filter((d) => d.isHoliday).length,
      workingDaysTotal: workingDays.length,
    };

    return res.status(200).json({
      success: true,
      data: {
        month,
        year,
        monthLabel: new Date(year, month - 1, 1).toLocaleDateString("en-US", {
          month: "long",
        }),
        monthStart: formatDateLocal(monthStart),
        monthEnd: formatDateLocal(monthEnd),
        isAtJoiningMonth,
        isAtCurrentMonth,
        shift: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        },
        summary,
        days,
      },
    });
  } catch (error) {
    console.error("[getAttendanceTimeline]", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
