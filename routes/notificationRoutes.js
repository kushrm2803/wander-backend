const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { respondToInvitation,getUnrespondedInvites } = require("../controllers/notificationController");

//GET /api/notifications/unresponded
router.get("/unresponded", authMiddleware, getUnrespondedInvites);

//POST /api/notifications/respond-to-invitation
router.post("/respond-to-invitation", authMiddleware, respondToInvitation);

module.exports = router;
