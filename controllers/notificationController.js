const Trip = require("../models/Trip");
const Notification = require("../models/Notifications");
const User = require("../models/User");

//GET /api/notifications/unresponded
exports.getUnrespondedInvites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({userId})
      .populate("tripId", "coverPhoto title") // gets the coverPhoto field from the Trip model
      .populate("blogId", "coverPhoto title")
      .populate("requestMadeBy", "photo name") // gets the profilePhoto and name fields from the User model
      .sort({createdAt: -1});
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

//function to create alert notification
const createAlertNotification = async (userId,tripId, message) => {
  try {
    const alert = new Notification({
      userId,
      tripId,
      message,
      type: "alert"
    });
    await alert.save();
  } catch (error) {
    console.error("Error creating alert notification:", error);
  }
};


// POST /api/notifications/respond-to-invitation
exports.respondToInvitation = async (req, res) => {
  try {
    const { notificationId, response } = req.body;
    const userId = req.user.userId;

    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    const trip = await Trip.findById(notification.tripId).populate("host");
    if (!trip) {
      await Notification.findByIdAndDelete(notificationId);
      return res.status(200).json({ message: "Trip not found" })
    };

    const memberIndex = trip.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.json({ message: "User is not invited to this trip" });
    }

    const user = await User.findById(userId);
    if(trip.members[memberIndex].status == "accepted"){
      res.json({message: "user is already a member"});
    }
    else if (response === "accept") {
      trip.members[memberIndex].status = "accepted";
      await trip.save();

      await createAlertNotification(trip.host._id,trip._id, `${user.name} accepted your trip ${trip.title} invitation.`);
      await createAlertNotification(userId,trip._id, `You have joined the trip ${trip.title}.`);

    } else if (response === "reject") {
      trip.members.splice(memberIndex, 1);
      await trip.save();

      await createAlertNotification(trip.host._id,trip._id, `${user.name} rejected your trip ${trip.title} invitation.`);

    } else {
      return res.status(400).json({ message: "Invalid response, use 'accept' or 'reject'" });
    }

    await Notification.findByIdAndDelete(notificationId);
    res.status(200).json({ message: "You have accepted the invitation!" });
  } catch (err) {
    console.error("Error responding to invitation:", err);
    res.status(500).json({ error: "Server Error" });
  }
};


//responds to join request
//POST /api/notifications/respond-to-request
exports.respondToRequest = async (req, res) => {
  try {
    const { notificationId, response } = req.body;
    const userId = req.user.userId;

    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    const trip = await Trip.findById(notification.tripId);
    if (!trip) {
      await Notification.findByIdAndDelete(notificationId);
      return res.json({ message: "Trip not found" })
    };

    if (trip.host.toString() !== userId) {
      return res.status(403).json({ message: "Only the host can manage join requests" });
    }

    const requestMadeBy = await User.findById(notification.requestMadeBy);
    if (!requestMadeBy) return res.status(404).json({ message: "User to join not found" });

    const memberIndex = trip.members.findIndex(
      (m) => m.user.toString() === requestMadeBy._id.toString()
    );
    if (memberIndex === -1) {
      return res.status(400).json({ message: "User has not requested to join this trip" });
    }

    if (response === "accept") {
      trip.members[memberIndex].status = "accepted";
      await trip.save();

      // Alert to user
      await createAlertNotification(
        requestMadeBy._id,
        trip._id,
        `Your request to join the trip ${trip.title} has been accepted.`
      );

      res.json({ message: "User is added" });
    } else if (response === "reject") {
      trip.members.splice(memberIndex, 1);
      await trip.save();

      // Alert to user
      await createAlertNotification(
        requestMadeBy._id,
        trip._id,
        `Your request to join the trip ${trip.title} was rejected.`
      );

      // Alert to host
      await createAlertNotification(
        userId,
        trip._id,
        `You rejected ${requestMadeBy.name}'s request to join your trip ${trip.title}.`
      );

      res.json({ message: "You have rejected the request!" });
    } else {
      return res.status(400).json({ message: "Invalid response, use 'accept' or 'reject'" });
    }

    await Notification.findByIdAndDelete(notificationId);
  } catch (err) {
    console.error("Error responding to request:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

//delete alert notification
//DELETE /api/notifications/delete-alert-notification/[id]
exports.deletAlertNotification = async (req, res) => {
  try {
    const userId = req.user.userId; // Extract user from auth middleware
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    // Check that the user owns it and it's an alert type
    if (userId !== notification.userId.toString() || (notification.type !== "alert" && notification.type !== "blogalert")) {
      return res.status(400).json({ message: "You cannot delete the notification :)" });
    }

    await Notification.findByIdAndDelete(notificationId);
    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
