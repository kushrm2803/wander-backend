const ChatRoom = require("../models/ChatRoom");
const Trip = require("../models/Trip");
const Notification = require("../models/Notifications");

//GET /api/chat/trip/[id]
exports.getChatRoom = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const acceptedMembers = trip.members
      .filter((member) => member.status === "accepted")
      .map((member) => member.user.toString());

    let chatRoom = await ChatRoom.findOne({ trip: tripId });

    if (!chatRoom) {
      chatRoom = new ChatRoom({
        trip: tripId,
        participants: acceptedMembers,
        messages: [],
      });
      await chatRoom.save();
    } else {
      let updated = false;
      acceptedMembers.forEach((memberId) => {
        const participantIds = chatRoom.participants.map((p) => p.toString());
        if (!participantIds.includes(memberId)) {
          chatRoom.participants.push(memberId);
          updated = true;
        }
      });
      if (updated) {
        await chatRoom.save();
      }
    }

    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST /api/chat/trip/[id]/message
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

    const participantIds = chatRoom.participants.map((p) => p.toString());
    if (!participantIds.includes(req.user.userId)) {
      chatRoom.participants.push(req.user.userId);
    }

    await chatRoom.save();

    // create alert notification
    const trip = await Trip.findById(tripId).populate("members.user");
    if (trip && trip.members) {
      const notifications = trip.members
        .filter(
          (member) =>
            member.status === "accepted" &&
            member.user._id.toString() !== req.user.userId
        )
        .map((member) => ({
          userId: member.user._id,
          tripId,
          message: `New message in trip: ${trip.title}`,
          type: "alert",
        }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//GET /api/chat/trip/[id]/all-messages
exports.getMessages = async (req, res) => {
  try {
    const { tripId } = req.params;
    const chatRoom = await ChatRoom.findOne({ trip: tripId }).populate(
      "messages.sender",
      "name email photo"
    );

    // If no chat room exists, return an empty array (instead of a 404 error)
    if (!chatRoom) {
      return res.json([]); 
    }

    // If the chat room exists but has no messages, return an empty array
    if (!chatRoom.messages || chatRoom.messages.length === 0) {
      return res.json([]);
    }

    res.json(chatRoom.messages);
  } catch (err) {
    res.status(500).json({ error: err.message }); // Only return error for actual issues
  }
};
