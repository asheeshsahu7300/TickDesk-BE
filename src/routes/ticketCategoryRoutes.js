const express = require("express");
const router = express.Router();
const ticketCategoryController = require("../controllers/ticketCategoryController");
const CategoryValidator = require("../validators/categoryValidator");
const RoleMiddleware = require("../middleware/roleMiddleware");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.post(
  "/create-category",
  authenticate,
  RoleMiddleware.requireAdmin(["admin"]),
  CategoryValidator.validateCreateMiddleware,
  ticketCategoryController.createCategory
);

router.get("/get-categories", ticketCategoryController.getCategories);

router.get(
  "/get-category/:id",
  CategoryValidator.validateIdMiddleware,
  ticketCategoryController.getCategoryById
);

router.put(
  "/update-category/:id",
  authenticate,
  CategoryValidator.validateUpdateMiddleware,
  ticketCategoryController.updateCategory
);

router.delete(
  "/delete-category/:id",
  authenticate,
  CategoryValidator.validateIdMiddleware,
  ticketCategoryController.deleteCategory
);

module.exports = router;
