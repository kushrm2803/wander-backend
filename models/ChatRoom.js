const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChatRoomSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  messages: [MessageSchema],
});

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
