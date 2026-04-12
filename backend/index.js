require("dotenv").config();
const express = require("express");
const http = require("http"); // ✅ 1. Required for Socket.io
const { Server } = require("socket.io"); // ✅ 2. Import Socket.io
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
require("./configs/passport.js");

const app = express();
const port = 8080;

// ✅ 3. Create the HTTP server using Express
const server = http.createServer(app);

// ✅ 4. Initialize Socket.io with the exact same CORS rules as Express
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
});

// ✅ 5. Make 'io' globally accessible so your routes can trigger notifications
app.set("io", io);

// ✅ 6. Listen for real-time connections from your React apps
io.on("connection", (socket) => {
  console.log(`⚡ WebSocket Connected: ${socket.id}`);

  // When an employee logs in, they tell the server their ID to join a private room
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their personal notification room`);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 WebSocket Disconnected: ${socket.id}`);
  });
});

// --- Middleware ---
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser()); // Allows Express to read HTTP-Only cookies
app.use(passport.initialize());

// --- Route Imports ---
const authRoutes = require("./routes/auth");
const adminoverviewroute = require("./routes/adminoverview");
const adminemployeesroute = require("./routes/adminemployee");
const admindepartmentsroute = require("./routes/admindepartments");
const adminleavesroute = require("./routes/adminleaves");
const adminshiftsroute = require("./routes/adminshifts");
const adminnotificationsroute = require("./routes/adminnotifications");
const adminschedulesroute = require("./routes/adminschedules");
const adminorganizationroute = require("./routes/adminorganization");
const manageadminroute = require("./routes/manageadmin");
const adminattendancecorrectionroute = require("./routes/adminattendancecorrection.js");
const adminholidayroute = require("./routes/adminholidays.js");

const requireAuth = require("./middleware/auth");

// --- Public Routes ---
app.use("/api/auth", authRoutes);

// --- Protected Routes (Require valid Cookie/JWT) ---

app.use("/api/admin/overview", requireAuth, adminoverviewroute);
app.use("/api/admin/employees", requireAuth, adminemployeesroute);
app.use("/api/admin/departments", requireAuth, admindepartmentsroute);
app.use("/api/admin/leaves", requireAuth, adminleavesroute);
app.use("/api/admin/shifts", requireAuth, adminshiftsroute);
app.use("/api/admin/notifications", requireAuth, adminnotificationsroute);
app.use("/api/admin/schedules", requireAuth, adminschedulesroute);
app.use("/api/admin/organization", requireAuth, adminorganizationroute);
app.use("/api/admin/manage-admins", requireAuth, manageadminroute);
app.use("/api/admin/attendance", requireAuth, adminattendancecorrectionroute);
app.use("/api/admin/holidays", requireAuth, adminholidayroute);

//EMPLOYEE
app.use("/api/employee", require("./routes/employee"));
// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(500).json({
    error: "An internal server error occurred. Please try again later.",
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
