const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);

  if (err.isJoi) {
    return res.status(400).json({
      message: "Validation error",
      details: err.details.map((detail) => detail.message),
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  res.status(500).json({ message: "Internal Server Error" });
};

module.exports = errorHandler;
