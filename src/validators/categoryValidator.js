class CategoryValidator {
  // CREATE VALIDATION
  static validateCreateCategory(data) {
    const errors = [];

    // Name
    if (
      !data.name ||
      typeof data.name !== "string" ||
      data.name.trim().length === 0
    ) {
      errors.push({
        field: "name",
        message: "Name is required and must be a non-empty string",
      });
    } else if (data.name.length > 100) {
      errors.push({
        field: "name",
        message: "Name cannot exceed 100 characters",
      });
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.name)) {
      errors.push({
        field: "name",
        message:
          "Name can only contain letters, numbers, spaces, hyphens, and underscores",
      });
    }

    // Description
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== "string") {
        errors.push({
          field: "description",
          message: "Description must be a string",
        });
      } else if (data.description.length > 500) {
        errors.push({
          field: "description",
          message: "Description cannot exceed 500 characters",
        });
      }
    }

    // Subcategories
    if (data.subcategories !== undefined) {
      if (!Array.isArray(data.subcategories)) {
        errors.push({
          field: "subcategories",
          message: "Subcategories must be an array",
        });
      } else {
        const namesSet = new Set();
        data.subcategories.forEach((subcategory, index) => {
          if (typeof subcategory !== "object" || !subcategory.name) {
            errors.push({
              field: `subcategories[${index}]`,
              message: "Each subcategory must be an object with a 'name' field",
            });
            return;
          }

          const name = subcategory.name;
          if (typeof name !== "string" || name.trim().length === 0) {
            errors.push({
              field: `subcategories[${index}].name`,
              message: "Subcategory name must be a non-empty string",
            });
          } else if (name.length > 100) {
            errors.push({
              field: `subcategories[${index}].name`,
              message: "Subcategory name cannot exceed 100 characters",
            });
          }

          if (
            subcategory.description &&
            typeof subcategory.description !== "string"
          ) {
            errors.push({
              field: `subcategories[${index}].description`,
              message: "Subcategory description must be a string",
            });
          }

          const normalized = name.trim().toLowerCase();
          if (namesSet.has(normalized)) {
            errors.push({
              field: "subcategories",
              message: `Duplicate subcategory name: '${name}'`,
            });
          } else {
            namesSet.add(normalized);
          }
        });

        if (data.subcategories.length > 20) {
          errors.push({
            field: "subcategories",
            message: "Cannot have more than 20 subcategories",
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // UPDATE VALIDATION
  static validateUpdateCategory(data) {
    const errors = [];

    if (!data || Object.keys(data).length === 0) {
      return {
        isValid: false,
        errors: [
          {
            field: "general",
            message: "At least one field must be provided for update",
          },
        ],
      };
    }

    if (data.name !== undefined) {
      if (typeof data.name !== "string" || data.name.trim().length === 0) {
        errors.push({
          field: "name",
          message: "Name must be a non-empty string",
        });
      } else if (data.name.length > 100) {
        errors.push({
          field: "name",
          message: "Name cannot exceed 100 characters",
        });
      } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(data.name)) {
        errors.push({
          field: "name",
          message:
            "Name can only contain letters, numbers, spaces, hyphens, and underscores",
        });
      }
    }

    if (data.description !== undefined) {
      if (data.description !== null && typeof data.description !== "string") {
        errors.push({
          field: "description",
          message: "Description must be a string or null",
        });
      } else if (data.description && data.description.length > 500) {
        errors.push({
          field: "description",
          message: "Description cannot exceed 500 characters",
        });
      }
    }

    if (data.subcategories !== undefined) {
      if (!Array.isArray(data.subcategories)) {
        errors.push({
          field: "subcategories",
          message: "Subcategories must be an array",
        });
      } else {
        const namesSet = new Set();
        data.subcategories.forEach((subcategory, index) => {
          if (typeof subcategory !== "object" || !subcategory.name) {
            errors.push({
              field: `subcategories[${index}]`,
              message: "Each subcategory must be an object with a 'name' field",
            });
            return;
          }

          const name = subcategory.name;
          if (typeof name !== "string" || name.trim().length === 0) {
            errors.push({
              field: `subcategories[${index}].name`,
              message: "Subcategory name must be a non-empty string",
            });
          } else if (name.length > 100) {
            errors.push({
              field: `subcategories[${index}].name`,
              message: "Subcategory name cannot exceed 100 characters",
            });
          }

          if (
            subcategory.description &&
            typeof subcategory.description !== "string"
          ) {
            errors.push({
              field: `subcategories[${index}].description`,
              message: "Subcategory description must be a string",
            });
          }

          const normalized = name.trim().toLowerCase();
          if (namesSet.has(normalized)) {
            errors.push({
              field: "subcategories",
              message: `Duplicate subcategory name: '${name}'`,
            });
          } else {
            namesSet.add(normalized);
          }
        });

        if (data.subcategories.length > 20) {
          errors.push({
            field: "subcategories",
            message: "Cannot have more than 20 subcategories",
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateId(id) {
    const errors = [];

    if (!id) {
      errors.push({ field: "id", message: "ID is required" });
    } else if (typeof id !== "string") {
      errors.push({ field: "id", message: "ID must be a string" });
    } else if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      errors.push({ field: "id", message: "Invalid ID format" });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  // SANITIZATION
  static sanitizeData(data) {
    const sanitized = {};

    if (data.name && typeof data.name === "string") {
      sanitized.name = data.name.trim();
    }

    if (data.description !== undefined) {
      sanitized.description =
        typeof data.description === "string"
          ? data.description.trim()
          : data.description;
    }

    if (data.subcategories !== undefined && Array.isArray(data.subcategories)) {
      sanitized.subcategories = data.subcategories
        .map((sub) => ({
          name: typeof sub.name === "string" ? sub.name.trim() : "",
          description:
            typeof sub.description === "string"
              ? sub.description.trim()
              : undefined,
        }))
        .filter((sub) => sub.name.length > 0);
    }

    return sanitized;
  }

  static validateCreateMiddleware(req, res, next) {
    const validation = CategoryValidator.validateCreateCategory(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    // Sanitize the data
    req.body = CategoryValidator.sanitizeData(req.body);
    next();
  }

  /**
   * Middleware function for validating category updates
   */
  static validateUpdateMiddleware(req, res, next) {
    // First validate the ID
    const idValidation = CategoryValidator.validateId(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: idValidation.errors,
      });
    }

    // Then validate the update data
    const validation = CategoryValidator.validateUpdateCategory(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    // Sanitize the data
    req.body = CategoryValidator.sanitizeData(req.body);
    next();
  }

  /**
   * Middleware function for validating category ID
   */
  static validateIdMiddleware(req, res, next) {
    const validation = CategoryValidator.validateId(req.params.id);

    if (!validation.isValid) {
      return res.status(400).json({
        error: "Validation Error",
        details: validation.errors,
      });
    }

    next();
  }
}

module.exports = CategoryValidator;
