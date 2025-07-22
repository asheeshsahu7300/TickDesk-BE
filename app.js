const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const logger = require("./src/common/utils/logger");

require("dotenv").config();

const port = 5000;
const connectDB = require("./src/config/db");
// const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const ticketRoutes = require("./src/routes/ticketRoutes");
const categoryRoutes = require("./src/routes/ticketCategoryRoutes");
const escalationRoutes = require("./src/routes/ticketEscalationRoutes");
const thresholdRoutes = require("./src/routes/escalationThresholdRoutes");
const escalationTeamRoutes = require("./src/routes/escalationTeamRoutes");
const resolutionRoutes = require("./src/routes/ticketResolutionRoutes");

// Import and initialize job scheduler
const JobScheduler = require("./src/jobs/jobs");

// Check status
// Runs every 10 seconds

const app = express();

// Connect to database
connectDB();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(cookieParser());
const scheduler = new JobScheduler(
  "*/10 * * * * *", // Auto-escalation every 10 seconds
  "*/1000 * * * * *" // Token refresh every hour
);
console.log(scheduler.getStatus());
// Start both jobs
scheduler.start();
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/escalations", escalationRoutes);
app.use("/api/thresholds", thresholdRoutes);
app.use("/api/escalation-teams", escalationTeamRoutes);
app.use("/api/resolutions", resolutionRoutes);

// Start the job scheduler

// Graceful shutdown handler
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Stopping job scheduler...");
  JobScheduler.stop();
  // Add any other cleanup needed
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    scheduler: JobScheduler.isRunning ? "running" : "stopped",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(port, () => {
  logger.info("Server started...");

  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

module.exports = app;
