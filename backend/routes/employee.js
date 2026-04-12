const express = require("express");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const router = express.Router();
const employeeController = require("../controllers/Employee");
const requireAuth = require("../middleware/auth");

router.post("/login", employeeController.loginUser);
router.post(
  "/registerBiometric",
  upload.single("image"),
  employeeController.registerBiometric,
);
router.post(
  "/mark-attendance",
  requireAuth,
  upload.array("frames", 25), // accept up to 25 frames
  employeeController.markAttendance,
);

router.post("/attendance/auto-wfh", employeeController.autoCreateWFHAttendance);

router.get(
  "/attendance-status",
  requireAuth,
  employeeController.getAttendanceStatus,
);

router.get(
  "/attendance/report",
  requireAuth,
  employeeController.getAttendanceReport,
);

router.get("/dashboard", requireAuth, employeeController.getDashboard);

//Schedule
router.get("/schedule/today", requireAuth, employeeController.getTodaySchedule);
router.get(
  "/schedule/monthly",
  requireAuth,
  employeeController.getMonthlySchedule,
);
router.post(
  "/schedule",
  requireAuth,
  employeeController.createOrUpdateSchedule,
);

router.patch(
  "/schedule/:date/task/:taskId",
  requireAuth,
  employeeController.updateTask,
);
router.delete(
  "/schedule/:date/task/:taskId",
  requireAuth,
  employeeController.deleteTask,
);

//Attendance analytics
router.get(
  "/attendance-monthly",
  requireAuth,
  employeeController.getMonthlyAttendance,
);

router.get(
  "/attendance/timeline",
  requireAuth,
  employeeController.getAttendanceTimeline,
);

router.get(
  "/attendance/weekly-hours",
  requireAuth,
  employeeController.getWeeklyHours,
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

//LEAVES

router
  .route("/leave")
  .get(requireAuth, employeeController.getLeaveSummary)
  .post(requireAuth, employeeController.createLeaveRequest);

router.delete(
  "/leave/:leaveId",
  requireAuth,
  employeeController.deleteLeaveRequest,
);

module.exports = router;
