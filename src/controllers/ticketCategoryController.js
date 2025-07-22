const Category = require("../models/Category");
const CategoryValidator = require("../validators/categoryValidator");

class TicketCategoryController {
  constructor() {
    this.createCategory = this.createCategory.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.getCategoryById = this.getCategoryById.bind(this);
    this.updateCategory = this.updateCategory.bind(this);
    this.deleteCategory = this.deleteCategory.bind(this);
  }

  async createCategory(req, res) {
    try {
      // Validate input data
      const validation = CategoryValidator.validateCreateCategory(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Validation Error",
          details: validation.errors,
        });
      }

      // Sanitize data
      const sanitizedData = CategoryValidator.sanitizeData(req.body);
      const { name, description, subcategories } = sanitizedData;

      // Check if category with same name already exists
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingCategory) {
        return res.status(409).json({
          error: "Category already exists",
          message: "A category with this name already exists",
        });
      }

      // Create the category
      const category = new Category({
        name,
        description,
        subcategories: subcategories || [],
      });

      await category.save();
      res.status(201).json(category);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await Category.find();
      res.status(200).json(categories);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCategoryById(req, res) {
    try {
      // Validate ID format
      const idValidation = CategoryValidator.validateId(req.params.id);
      if (!idValidation.isValid) {
        return res.status(400).json({
          error: "Validation Error",
          details: idValidation.errors,
        });
      }

      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.status(200).json(category);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateCategory(req, res) {
    try {
      // Validate ID format
      const idValidation = CategoryValidator.validateId(req.params.id);
      if (!idValidation.isValid) {
        return res.status(400).json({
          error: "Validation Error",
          details: idValidation.errors,
        });
      }

      // Validate update data
      const validation = CategoryValidator.validateUpdateCategory(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Validation Error",
          details: validation.errors,
        });
      }

      // Sanitize data
      const sanitizedData = CategoryValidator.sanitizeData(req.body);
      const { name, description, subcategories } = sanitizedData;

      // If updating name, check if another category with same name exists
      if (name) {
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${name}$`, "i") },
          _id: { $ne: req.params.id },
        });

        if (existingCategory) {
          return res.status(409).json({
            error: "Category name already exists",
            message: "Another category with this name already exists",
          });
        }
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { name, description, subcategories },
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.status(200).json(category);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deleteCategory(req, res) {
    try {
      // Validate ID format
      const idValidation = CategoryValidator.validateId(req.params.id);
      if (!idValidation.isValid) {
        return res.status(400).json({
          error: "Validation Error",
          details: idValidation.errors,
        });
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _handleError(res, error) {
    console.error("Category Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        error: "Invalid ID format",
        message: "The provided ID is not valid",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = new TicketCategoryController();
