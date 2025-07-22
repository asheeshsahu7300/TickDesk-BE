class TicketValidator {
  static validateObjectId(id, field = "id") {
    const errors = [];
    if (!id) {
      errors.push({ field, message: `${field} is required` });
    } else if (typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      errors.push({
        field,
        message: `${field} must be a valid MongoDB ObjectId`,
      });
    }
    return errors;
  }

  static validateCreateTicket(data) {
    const errors = [];

    // Required fields
    if (!data.category || typeof data.category !== "string") {
      errors.push({
        field: "category",
        message: "Category is required and must be a string",
      });
    }

    if (
      !data.description ||
      typeof data.description !== "string" ||
      data.description.trim().length < 5
    ) {
      errors.push({
        field: "description",
        message:
          "Description is required and must be at least 5 characters long",
      });
    }

    if (
      !data.priority ||
      !["Low", "Medium", "High", "Urgent"].includes(data.priority)
    ) {
      errors.push({
        field: "priority",
        message: "Priority must be one of: Low, Medium, High, Urgent",
      });
    }

    if (data.assignee && typeof data.assignee !== "string") {
      errors.push({
        field: "assignee",
        message: "Assignee must be a string (user ID)",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateAddComment(data) {
    const errors = [];

    if (
      !data.message ||
      typeof data.message !== "string" ||
      data.message.trim().length === 0
    ) {
      errors.push({ field: "message", message: "Message is required" });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateUpdateStatus(data) {
    const errors = [];

    const validStatuses = ["Open", "In Progress", "Resolved", "Closed"];
    if (!data.status || !validStatuses.includes(data.status)) {
      errors.push({
        field: "status",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (
      data.status === "Resolved" &&
      (!data.resolution_description ||
        data.resolution_description.trim().length < 5)
    ) {
      errors.push({
        field: "resolution_description",
        message: "Resolution description must be at least 5 characters long",
      });
    }

    if (data.status === "Closed") {
      if (!data.closure_reason || data.closure_reason.trim().length < 5) {
        errors.push({
          field: "closure_reason",
          message: "Closure reason must be at least 5 characters long",
        });
      }

      if (typeof data.assurance !== "boolean") {
        errors.push({
          field: "assurance",
          message: "Assurance must be a boolean value",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateEscalation(data) {
    const errors = [];

    if (!data.escalated_to || typeof data.escalated_to !== "string") {
      errors.push({
        field: "escalated_to",
        message: "Escalated_to is required and must be a string (user ID)",
      });
    }

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
}

module.exports = TicketValidator;
