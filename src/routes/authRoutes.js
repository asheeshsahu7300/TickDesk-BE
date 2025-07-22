const express = require("express");
const AuthController = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const UserValidator = require("../validators/userValidator");

const router = express.Router();

// Public routes
router.post("/register", UserValidator.validateLogin, AuthController.register);
router.post("/login", UserValidator.validateRegister, AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post(
  "/request-password-reset",
  UserValidator.validateRequestPasswordReset,
  AuthController.requestPasswordReset
);
router.post(
  "/reset-password",
  UserValidator.validateResetPassword,
  AuthController.resetPassword
);

// Protected routes
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.put(
  "/update-profile",
  UserValidator.validateUpdateProfile,
  AuthController.updateProfile
);
router.get("/profile", AuthController.getProfile);

module.exports = router;
