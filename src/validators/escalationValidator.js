class EscalationValidator {
  // ====== Validate Ticket ID Format ======
  static validateId(id) {
    const errors = [];

    if (!id) {
      errors.push({ field: "ticketId", message: "Ticket ID is required" });
    } else if (typeof id !== "string") {
      errors.push({ field: "ticketId", message: "Ticket ID must be a string" });
    } else if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      errors.push({ field: "ticketId", message: "Invalid Ticket ID format" });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ====== Validate Manual Escalation ======
  static validateManualEscalation(data) {
    const errors = [];

    // Ticket ID
    const idValidation = EscalationValidator.validateId(data.ticketId);
    if (!idValidation.isValid) errors.push(...idValidation.errors);

    // Reason
    if (
      !data.reason ||
      typeof data.reason !== "string" ||
      data.reason.trim().length < 5
    ) {
      errors.push({
        field: "reason",
        message: "Reason is required and must be at least 5 characters long",
      });
    }

    // Level
    if (typeof data.level !== "number" || data.level < 1) {
      errors.push({
        field: "level",
        message: "Escalation level must be a number >= 1",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ====== Validate De-Escalation ======
  static validateDeEscalation(data) {
    const errors = [];

    // Ticket ID
    const idValidation = EscalationValidator.validateId(data.ticketId);
    if (!idValidation.isValid) errors.push(...idValidation.errors);

    // Reason
    if (
      !data.reason ||
      typeof data.reason !== "string" ||
      data.reason.trim().length < 5
    ) {
      errors.push({
        field: "reason",
        message: "Reason is required and must be at least 5 characters long",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ====== Sanitize Common Data ======
  static sanitizeData(data) {
    const sanitized = {};

    if (data.ticketId && typeof data.ticketId === "string") {
      sanitized.ticketId = data.ticketId.trim();
    }

    if (data.reason && typeof data.reason === "string") {
      sanitized.reason = data.reason.trim();
    }

    if (data.level !== undefined) {
      sanitized.level = data.level;
    }

    return sanitized;
  }

  // ====== Manual Escalation Middleware ======
  static validateManualEscalation(req, res, next) {
    const validation = EscalationValidator.validateManualEscalation(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    req.body = EscalationValidator.sanitizeData(req.body);
    next();
  }

  // ====== De-Escalation Middleware ======
  static validateDeEscalation(req, res, next) {
    const validation = EscalationValidator.validateDeEscalation(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    req.body = EscalationValidator.sanitizeData(req.body);
    next();
  }

  // ====== Ticket ID Param Middleware (for GET /history/:ticketId) ======
  static validateTicketIdParamMiddleware(req, res, next) {
    const validation = EscalationValidator.validateId(req.params.ticketId);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    next();
  }
}

module.exports = EscalationValidator;
