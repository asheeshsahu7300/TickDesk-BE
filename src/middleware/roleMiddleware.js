class RoleMiddleware {
  static requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: "Authentication required",
            message: "User authentication failed or missing",
          });
        }

        // Check if user has a role property
        if (!req.user.role) {
          return res.status(403).json({
            error: "Access denied",
            message: "User role not assigned or found",
          });
        }

        // Normalize role comparison (case insensitive)
        const userRole = req.user.role.toLowerCase();
        const normalizedRoles = roles.map((role) => role.toLowerCase());

        // Check if user's role is in the allowed roles
        if (!normalizedRoles.includes(userRole)) {
          return res.status(403).json({
            error: "Insufficient permissions",
            message: `Access denied. Required role(s): ${roles.join(
              ", "
            )}. Your role: ${req.user.role}`,
            requiredRoles: roles,
            userRole: req.user.role,
          });
        }

        // Add role info to request for potential use in controllers
        req.userRole = req.user.role;
        req.roleLevel = this.getRoleLevel(req.user.role);

        // User has required role, proceed
        next();
      } catch (error) {
        console.error("Role middleware error:", error);
        return res.status(500).json({
          error: "Internal server error",
          message: "Error checking user permissions",
        });
      }
    };
  }

  static requireEmployeeOrAbove() {
    return this.requireRole(["employee", "agent", "admin"]);
  }

  static requireAgentOrAbove() {
    return this.requireRole(["agent", "admin"]);
  }

  static requireAdmin() {
    return this.requireRole(["admin"]);
  }

  static requireEmployee() {
    return this.requireRole(["employee"]);
  }

  static requireAgent() {
    return this.requireRole(["agent"]);
  }

  static hasRole(user, roles) {
    if (!user || !user.role) return false;

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  }

  static getRoleLevel(role) {
    const roleLevels = {
      employee: 1,
      agent: 2,
      admin: 3,
    };
    return roleLevels[role] || 0;
  }

  static hasMinimumRole(user, minimumRole) {
    if (!user || !user.role) return false;

    const userLevel = this.getRoleLevel(user.role);
    const requiredLevel = this.getRoleLevel(minimumRole);

    return userLevel >= requiredLevel;
  }

  static requireMinimumRole(minimumRole) {
    return (req, res, next) => {
      try {
        // authMiddleware should have already verified authentication
        if (!req.user) {
          return res.status(401).json({
            error: "Authentication required",
            message: "User authentication failed or missing",
          });
        }

        if (!req.user.role) {
          return res.status(403).json({
            error: "Access denied",
            message: "User role not assigned or found",
          });
        }

        if (!this.hasMinimumRole(req.user, minimumRole)) {
          const userLevel = this.getRoleLevel(req.user.role);
          const requiredLevel = this.getRoleLevel(minimumRole);

          return res.status(403).json({
            error: "Insufficient permissions",
            message: `Access denied. Minimum role required: ${minimumRole}. Your role: ${req.user.role}`,
            minimumRole: minimumRole,
            userRole: req.user.role,
            minimumLevel: requiredLevel,
            userLevel: userLevel,
          });
        }

        // Add role info to request
        req.userRole = req.user.role;
        req.roleLevel = this.getRoleLevel(req.user.role);

        next();
      } catch (error) {
        console.error("Minimum role middleware error:", error);
        return res.status(500).json({
          error: "Internal server error",
          message: "Error checking user permissions",
        });
      }
    };
  }

  static canModifyUser(userIdParam = "userId") {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: "Authentication required",
            message: "User authentication failed or missing",
          });
        }

        const targetUserId = req.params[userIdParam];
        const currentUserId = req.user.id || req.user._id;
        const userRole = req.user.role;

        // Admin and agent can modify any user
        if (["admin", "agent"].includes(userRole.toLowerCase())) {
          req.canModifyAnyUser = true;
          return next();
        }

        // Regular users can only modify themselves
        if (currentUserId.toString() !== targetUserId.toString()) {
          return res.status(403).json({
            error: "Access denied",
            message: "You can only modify your own data",
            userRole: userRole,
          });
        }

        req.canModifyAnyUser = false;
        next();
      } catch (error) {
        console.error("User modification check error:", error);
        return res.status(500).json({
          error: "Internal server error",
          message: "Error checking user modification permissions",
        });
      }
    };
  }
}

module.exports = RoleMiddleware;
