const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const adminroute = require("./routes/admin");
const port = 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser());

app.use(express.json());
app.use(bodyParser.json());

app.use("/api/admin", adminroute);

app.listen(port, () => {
  console.log("Server started");
});
