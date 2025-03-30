const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { respondToInvitation,getUnrespondedInvites, respondToRequest } = require("../controllers/notificationController");

//GET /api/notifications/unresponded
router.get("/unresponded", authMiddleware, getUnrespondedInvites);

//POST /api/notifications/respond-to-invitation
router.post("/respond-to-invitation", authMiddleware, respondToInvitation);

//POST /api/notifications/respond-to-request
router.post("/respond-to-request", authMiddleware, respondToRequest);


module.exports = router;
