const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { respondToInvitation } = require("../controllers/notificationController");

//GET /api/notifications/respondToInvitation
router.post("/respond-to-invitation", authMiddleware, respondToInvitation);

module.exports = router;
