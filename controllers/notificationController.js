const Trip = require("../models/Trip");
const Notification = require("../models/Notifications");

//GET /api/notifications/unresponded
exports.getUnrespondedInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({ userId, isRead: false });
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// POST /api/notifications/respond-to-invitation
exports.respondToInvitation = async (req, res) => {
  try {
    const { notificationId, response } = req.body; // Accept or Reject
    const userId = req.user.userId; // Extract user from auth middleware

    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    // Find the trip related to this notification
    const trip = await Trip.findById(notification.tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Check if the user is in the trip members list
    const memberIndex = trip.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: "User is not invited to this trip" });
    }

    if (response === "accept") {
      // Change status to accepted
      trip.members[memberIndex].status = "accepted";
      await trip.save();
      res.json({ message: "You have accepted the invitation!" });
    } else if (response === "reject") {
      // Remove user from members list
      trip.members.splice(memberIndex, 1);
      await trip.save();
      res.json({ message: "You have rejected the invitation!" });
    } else {
      return res.status(400).json({ message: "Invalid response, use 'accept' or 'reject'" });
    }

    // Remove the notification after processing response
    await Notification.findByIdAndDelete(notificationId);
  } catch (err) {
    console.error("Error responding to invitation:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
