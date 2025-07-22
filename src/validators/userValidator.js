class UserValidator {
  // ==== Validate Registration ====
  static validateRegister(req, res, next) {
    const { email, password, name, role, team_id, remember_me } = req.body;
    const errors = [];

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push({ field: "email", message: "Valid email is required" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      errors.push({
        field: "password",
        message: "Password must be at least 6 characters long",
      });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (!role || !["admin", "agent", "employee"].includes(role)) {
      errors.push({
        field: "role",
        message: "Role must be one of admin, agent, or employee",
      });
    }

    if (role === "agent" && (!team_id || typeof team_id !== "string")) {
      errors.push({
        field: "team_id",
        message: "Team ID is required for agents and must be a string",
      });
    }

    if (remember_me !== undefined && typeof remember_me !== "boolean") {
      errors.push({
        field: "remember_me",
        message: "remember_me must be a boolean",
      });
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation Error", details: errors });
    }

    next();
  }

  // ==== Validate Login ====
  static validateLogin(req, res, next) {
    const { email, password, remember_me } = req.body;
    const errors = [];

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push({ field: "email", message: "Valid email is required" });
    }

    if (!password || typeof password !== "string") {
      errors.push({ field: "password", message: "Password is required" });
    }

    if (remember_me !== undefined && typeof remember_me !== "boolean") {
      errors.push({
        field: "remember_me",
        message: "remember_me must be a boolean",
      });
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation Error", details: errors });
    }

    next();
  }

  // ==== Validate Password Reset Request ====
  static validateRequestPasswordReset(req, res, next) {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        error: "Validation Error",
        details: [{ field: "email", message: "Valid email is required" }],
      });
    }

    next();
  }

  // ==== Validate Password Reset ====
  static validateResetPassword(req, res, next) {
    const { token } = req.query;
    const { newPassword } = req.body;
    const errors = [];

    if (!token || typeof token !== "string") {
      errors.push({ field: "token", message: "Reset token is required" });
    }

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      errors.push({
        field: "newPassword",
        message: "New password must be at least 6 characters long",
      });
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation Error", details: errors });
    }

    next();
  }

  // ==== Validate Profile Update ====
  static validateUpdateProfile(req, res, next) {
    const { name, email, currentPassword, newPassword, team_id } = req.body;
    const errors = [];

    if (email && (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))) {
      errors.push({ field: "email", message: "Email must be valid" });
    }

    if (name && (typeof name !== "string" || name.trim().length === 0)) {
      errors.push({
        field: "name",
        message: "Name must be a non-empty string",
      });
    }

    if (team_id && typeof team_id !== "string") {
      errors.push({ field: "team_id", message: "Team ID must be a string" });
    }

    if (currentPassword && typeof currentPassword !== "string") {
      errors.push({
        field: "currentPassword",
        message: "Current password must be a string",
      });
    }

    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        errors.push({
          field: "newPassword",
          message: "New password must be at least 6 characters long",
        });
      }
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation Error", details: errors });
    }

    next();
  }
}

module.exports = UserValidator;
