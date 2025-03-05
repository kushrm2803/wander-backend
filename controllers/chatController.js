const ChatRoom = require("../models/ChatRoom");

exports.getChatRoom = async (req, res) => {
  try {
    const { tripId } = req.params;
    let chatRoom = await ChatRoom.findOne({ trip: tripId });
    if (!chatRoom) {
      chatRoom = new ChatRoom({
        trip: tripId,
        participants: [req.user.userId],
        messages: [],
      });
      await chatRoom.save();
    }
    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { content } = req.body;
    let chatRoom = await ChatRoom.findOne({ trip: tripId });
    if (!chatRoom) {
      chatRoom = new ChatRoom({
        trip: tripId,
        participants: [req.user.userId],
        messages: [],
      });
    }
    const message = { sender: req.user.userId, content };
    chatRoom.messages.push(message);
    if (!chatRoom.participants.includes(req.user.userId)) {
      chatRoom.participants.push(req.user.userId);
    }
    await chatRoom.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { tripId } = req.params;
    const chatRoom = await ChatRoom.findOne({ trip: tripId })
      .populate("messages.sender", "name email");
    if (!chatRoom) return res.status(404).json({ message: "Chat room not found" });
    res.json(chatRoom.messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
