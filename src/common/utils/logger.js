// utils/logger.js
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, errors, colorize } = format;
const fs = require("fs");
const path = require("path");

// Ensure logs directory exists

const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});
console.log(logDir);
// Logger
const logger = createLogger({
  level: "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }), // log stack trace for errors
    logFormat
  ),
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({ format: combine(colorize(), logFormat) })
  );
}

module.exports = logger;
