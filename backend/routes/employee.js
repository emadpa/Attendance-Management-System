const express = require("express");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const router = express.Router();
const employeeController = require("../controllers/Employee");
const requireAuth = require("../middleware/auth");

router.post(
  "/registerBiometric",
  upload.single("image"),
  employeeController.registerBiometric,
);
router.post("/login", employeeController.loginUser);
router.post(
  "/mark-attendance",
  requireAuth,
  upload.array("frames", 25), // accept up to 25 frames
  employeeController.markAttendance,
);

router.post("/attendance/auto-wfh", employeeController.autoCreateWFHAttendance);

router.get(
  "/attendance/:userId/:year",
  requireAuth,
  employeeController.getYearlyAttendancePercentage,
);

router.get("/dashboard", requireAuth, employeeController.getDashboard);
router.get("/today-schedule", requireAuth, employeeController.getTodaySchedule);
router.get(
  "/attendance-monthly",
  requireAuth,
  employeeController.getMonthlyAttendance,
);

router.get("/notifications", requireAuth, employeeController.getNotifications);
router.patch(
  "/notifications/read-all",
  requireAuth,
  employeeController.markAllNotificationsAsRead,
);
router.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  employeeController.markNotificationRead,
);

module.exports = router;
