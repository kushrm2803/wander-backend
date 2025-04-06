const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { respondToInvitation,getUnrespondedInvites, respondToRequest, deletAlertNotification } = require("../controllers/notificationController");

//GET /api/notifications/unresponded
router.get("/unresponded", authMiddleware, getUnrespondedInvites);

//POST /api/notifications/respond-to-invitation
router.post("/respond-to-invitation", authMiddleware, respondToInvitation);

//POST /api/notifications/respond-to-request
router.post("/respond-to-request", authMiddleware, respondToRequest);

// DELETE /api/notifications/delete-alert-notification/:id
router.delete("/delete-alert-notification/:id", authMiddleware, deletAlertNotification);

module.exports = router;
