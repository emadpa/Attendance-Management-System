const express = require("express");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
const employeeController = require("../controllers/Employee");

router.post(
  "/registerBiometric",
  upload.single("image"),
  employeeController.registerBiometric,
);
router.post("/login", employeeController.loginUser);

router.post("/attendance/auto-wfh", employeeController.autoCreateWFHAttendance);

router.get(
  "/attendance/:userId/:year",
  employeeController.getYearlyAttendancePercentage,
);

router.get("/dashboard", employeeController.getDashboard);
router.get("/today-schedule", employeeController.getTodaySchedule);
router.get("/attendance-monthly", employeeController.getMonthlyAttendance);
router.patch(
  "/notifications/:notificationId/read",
  employeeController.markNotificationRead,
);

module.exports = router;
