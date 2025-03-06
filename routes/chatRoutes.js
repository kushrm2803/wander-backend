const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

//GET /api/chat/trip/[id]
router.get("/trip/:tripId", authMiddleware, chatController.getChatRoom);
//POST /api/chat/trip/[id]/message
router.post("/trip/:tripId/message", authMiddleware, chatController.postMessage);
//GET /api/chat/trip/[id]/all-messages
router.get("/trip/:tripId/all-messages", authMiddleware, chatController.getMessages);

module.exports = router;
