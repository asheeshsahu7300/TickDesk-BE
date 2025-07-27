const express = require("express");
const router = express.Router();
const EscalationTeamController = require("../controllers/escalationTeamController");
const RoleMiddleware = require("../middleware/roleMiddleware");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Create a new escalation team
router.post(
  "/create-team",
  authenticate,
  RoleMiddleware.requireAdmin(["admin"]),
  EscalationTeamController.createTeam
);
router.get("/teams", EscalationTeamController.getAllTeams);
router.get("/teams/:id", EscalationTeamController.getTeamById);
router.get("/teams-list", EscalationTeamController.getTeamNamesWithIds);
router.put("/teams/:id", authenticate, EscalationTeamController.updateTeam);
router.delete("/teams/:id", authenticate, EscalationTeamController.deleteTeam);
router.post(
  "/teams/:teamId/members",
  authenticate,
  EscalationTeamController.addTeamMember
);
router.delete(
  "/teams/:teamId/members",
  authenticate,
  EscalationTeamController.removeTeamMember
);

module.exports = router;
