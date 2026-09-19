const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth.routes");
const teamRoutes = require("./routes/team.routes");
const userRoutes = require("./routes/user.routes");
const fileRoutes = require("./routes/file.routes");
const shareRoutes = require("./routes/share.routes");
const notificationRoutes = require("./routes/notification.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


// app.use("/api");

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "File sharing API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

module.exports = app;