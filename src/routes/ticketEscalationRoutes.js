const express = require("express");
const EscalationController = require("../controllers/escalationController");
const { authenticate } = require("../middleware/authMiddleware");
const EscalationValidator = require("../validators/escalationValidator");
const router = express.Router();

router.post("/auto-escalate", authenticate, EscalationController.autoEscalate);
router.post(
  "/manual-escalate",
  authenticate,
  EscalationController.manualEscalate
);
router.post(
  "/de-escalate",
  authenticate,
  EscalationValidator.validateDeEscalation,
  EscalationController.deEscalate
);
router.get(
  "/history/:ticketId",
  authenticate,
  EscalationController.getEscalationHistory
);

module.exports = router;
