const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// Get or create chat room for a trip
router.get("/trip/:tripId", authMiddleware, chatController.getChatRoom);
// Post a new message in the trip chat room
router.post("/trip/:tripId/message", authMiddleware, chatController.postMessage);
// Get all messages for a trip's chat room
router.get("/trip/:tripId/messages", authMiddleware, chatController.getMessages);

module.exports = router;
