const User = require("../models/User");
const EscalationTeam = require("../models/EscalationTeam");
const Authorization = require("../common/utils/generateJWT");
const EmailService = require("./emailServiceController");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class AuthController {
  constructor() {
    this.register = this.register.bind(this); // Explicitly bind methods
    this.login = this.login.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.requestPasswordReset = this.requestPasswordReset.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.logout = this.logout.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this._handleError = this._handleError.bind(this); // Bind the helper method as well
  }

  async register(req, res) {
    try {
      const { email, password, name, role, team_id, remember_me } = req.body;

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }

      if (role === "agent" && !team_id) {
        return res
          .status(400)
          .json({ error: "Team ID is required for agents" });
      }

      if (team_id) {
        const team = await EscalationTeam.findById(team_id);
        if (!team) {
          return res.status(404).json({ error: "Team not found" });
        }
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        team_id,
      });

      const token = await Authorization.generateJwtToken(user);
      const refreshToken = this._generateRefreshToken();

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 1000,
      });

      if (remember_me) {
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        await User.findByIdAndUpdate(user._id, {
          refreshToken,
          lastLogin: new Date(),
        });
      }

      res.status(201).json({
        accessToken: token,
        refreshToken,
        user: this._sanitizeUser(user),
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async login(req, res) {
    try {
      const { email, password, remember_me } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = await Authorization.generateJwtToken(user._id);
      const refreshToken = this._generateRefreshToken();

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 1000,
      });

      if (remember_me) {
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        await User.findByIdAndUpdate(user._id, {
          refreshToken,
          lastLogin: new Date(),
        });
      }
      res.json({
        accessToken: token,
        refreshToken,
        user: this._sanitizeUser(user),
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async refreshToken(req, res) {
    try {
      // Access the access token
      const token = req.cookies.accessToken;
      if (token) {
        return res.status(200).json({ message: "Access token is present" });
      }

      // Access the refresh token
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken || typeof refreshToken !== "string") {
        return res.status(400).json({
          error: "Refresh token is required and must be a valid string",
        });
      }

      // Verify the refresh token against the database
      const user = await User.findOne({ refreshToken });
      if (!user) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Generate new tokens
      const newAccessToken = await Authorization.generateJwtToken(user._id);
      const newRefreshToken = this._generateRefreshToken();

      // Update the refresh token in the database
      await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

      // Set the new refresh token as an HTTP-only cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 1000,
      });

      // Send the new tokens to the client
      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Error in refreshToken:", error);
      this._handleError(res, error);
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        await User.findByIdAndUpdate(user._id, {
          resetToken,
          resetTokenExpiry,
        });

        await EmailService.sendResetEmail(user.email, resetToken);
      }

      res.json({
        message: "If account exists, reset instructions sent to email",
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.query;
      const { newPassword } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Reset token is required." });
      }

      if (!newPassword || newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long." });
      }

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token." });
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await User.findByIdAndUpdate(
        user._id,
        {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          refreshToken: null,
        },
        { new: true }
      );

      res.json({ message: "Password reset successful." });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async logout(req, res) {
    try {
      await User.findByIdAndUpdate(req.user.id, {
        refreshToken: null,
      });
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, email, currentPassword, newPassword, team_id } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update basic info
      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();

      // Update team if agent
      if (team_id && user.role === "agent") {
        const team = await EscalationTeam.findById(team_id);
        if (!team) {
          return res.status(404).json({ error: "Team not found" });
        }
        user.team_id = team_id;
      }

      // Update password if provided
      if (currentPassword && newPassword) {
        const isValidPassword = await bcrypt.compare(
          currentPassword,
          user.password
        );
        if (!isValidPassword) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }

        if (newPassword.length < 6) {
          return res
            .status(400)
            .json({ error: "New password must be at least 6 characters" });
        }

        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(newPassword, salt);
      }

      await user.save();
      res.json({
        message: "Profile updated successfully",
        user: this._sanitizeUser(user),
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(this._sanitizeUser(user));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _generateRefreshToken() {
    return crypto.randomBytes(40).toString("hex");
  }

  _sanitizeUser(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login: user.lastLogin,
    };
  }

  _handleError(res, error) {
    console.error("Auth Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: "Duplicate Entry",
        message: "Email already exists",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = new AuthController();
