const express = require("express");
const TicketController = require("../controllers/ticketController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const TicketValidator = require("../validators/ticketValidator");

const router = express.Router();
router.post(
  "/create-ticket",
  authenticate,

  TicketController.createTicket
);
router.get("/", authenticate, TicketController.getTickets);
router.get("/:id", authenticate, TicketController.getTicketById);
router.post(
  "/:id/comments",
  authenticate,
  TicketValidator.validateAddComment,
  TicketController.addComment
);
router.patch(
  "/:id/status",
  authenticate,
  RoleMiddleware.requireRole(["admin", "agent"]),
  TicketValidator.validateUpdateStatus,
  TicketController.updateStatus
);
router.post(
  "/:id/escalate",
  authenticate,
  RoleMiddleware.requireRole(["admin", "agent"]),
  TicketValidator.validateEscalation,
  TicketController.escalateTicket
);

module.exports = router;
