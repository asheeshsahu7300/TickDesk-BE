const express = require("express");
const EscalationThresholdController = require("../controllers/escalationThersholdController");
const router = express.Router();

router.post("/create-thershold", EscalationThresholdController.createThreshold);
router.get("/", EscalationThresholdController.getAllThresholds);
router.get("/:id", EscalationThresholdController.getThresholdById);
router.put("/:id", EscalationThresholdController.updateThreshold);
router.delete("/:id", EscalationThresholdController.deleteThreshold);
router.get("/validate", EscalationThresholdController.validateThresholds);

module.exports = router;
