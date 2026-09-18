const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth.routes");
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

app.use(errorHandler);

module.exports = app;