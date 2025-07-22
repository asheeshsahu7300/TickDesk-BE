const mongoose = require("mongoose");
const logger = require("../common/utils/logger");

async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
    logger.info("MongoDB connection success");
  } catch (err) {
    logger.error("MongoDB connection failed");
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
