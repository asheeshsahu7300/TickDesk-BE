const express = require('express');
const ResolutionController = require('../controllers/resolutionController');
const{ authenticate} = require('../middleware/authMiddleware'); // Middleware to authenticate the user

const router = express.Router();

router.post('/tickets/:id/resolve', authenticate, ResolutionController.resolveTicket);
router.post('/tickets/:id/close', authenticate, ResolutionController.closeTicket);
router.post('/tickets/:id/reject', authenticate, ResolutionController.rejectResolution);
router.get('/metrics/resolutions', authenticate, ResolutionController.getResolutionMetrics);

module.exports = router;
