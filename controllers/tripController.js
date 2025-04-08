const cloudinary = require("../config/cloudinary");
const Trip = require("../models/Trip");
const User = require("../models/User");
const Notification = require("../models/Notifications")
const Fuse = require("fuse.js");
const { sendPushNotification } = require('../services/notificationService');

// POST /api/trips
exports.createTrip = async (req, res) => {
  try {
    // Parse stringified JSON fields if necessary
    if (typeof req.body.metadata === "string") {
      req.body.metadata = JSON.parse(req.body.metadata);
    }
    if (typeof req.body.itinerary === "string") {
      req.body.itinerary = JSON.parse(req.body.itinerary);
    }
    if (typeof req.body.packingEssentials === "string") {
      req.body.packingEssentials = JSON.parse(req.body.packingEssentials);
    }
    if (typeof req.body.tags === "string") {
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch (e) {
        req.body.tags = req.body.tags.split(",").map((t) => t.trim());
      }
    }

    // Extract fields from request
    let { coverPhoto } = req.body;
    const {
      title,
      description,
      metadata,
      itinerary,
      packingEssentials,
      estimatedBudget,
      actualBudget,
      tags,
      isPublic,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Upload coverPhoto if provided
    if (req.files?.coverPhoto) {
      const result = await cloudinary.uploader.upload(req.files.coverPhoto[0].path, {
        folder: "trip-covers",
      });
      coverPhoto = result.secure_url;
    }

// Upload multiple tripPhotos
let tripPhotos = [];
if (req.files?.tripPhotos) {
  const captions = req.body.photosCaptions; // Extract captions from request body

  const uploadPromises = req.files.tripPhotos.map(async (file, index) => {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "trip-photos",
    });

    return { 
      url: result.secure_url, 
      caption: Array.isArray(captions) ? captions[index] || "" : captions || "" // Handle both single and multiple captions
    };
  });

  tripPhotos = await Promise.all(uploadPromises);
}

    // Create trip document
    const trip = new Trip({
      title,
      description,
      metadata,
      itinerary,
      packingEssentials,
      estimatedBudget,
      actualBudget,
      tags,
      isPublic,
      status: status || "planning",
      coverPhoto,
      tripPhotos,
      host: req.user.userId,
      members: [{ user: req.user.userId, role: "host", status: "accepted" }],
    });

    await trip.save();

    // Update user's trip history
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { tripHistory: trip._id },
    });

    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// GET /api/trips/[TripID]
exports.getTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("host")
      .populate("members.user");
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const hasEditAccess = (trip, userId) => {
  if (trip.host.toString() === userId) return true;
  const member = trip.members.find(
    (m) => m.user.toString() === userId && m.status === "accepted"
  );
  return member && member.role === "editor";
};

// PUT /api/trips/[TripID]
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (!hasEditAccess(trip, req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to edit this trip" });
    }
    const {
      title,
      description,
      metadata,
      itinerary,
      packingEssentials,
      estimatedBudget,
      actualBudget,
      tags,
      isPublic,
      status,
      coverPhoto,
      photos,
    } = req.body;
    if (title) trip.title = title;
    if (description) trip.description = description;
    if (metadata) trip.metadata = metadata;
    if (itinerary) trip.itinerary = itinerary;
    if (packingEssentials) trip.packingEssentials = packingEssentials;
    if (estimatedBudget) trip.estimatedBudget = estimatedBudget;
    if (actualBudget !== undefined) trip.actualBudget = actualBudget;
    if (tags) trip.tags = tags;
    if (isPublic !== undefined) trip.isPublic = isPublic;
    if (status) trip.status = status;
    if (coverPhoto) trip.coverPhoto = coverPhoto;
    if (photos) trip.photos = photos;
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/trips/[TripID]  (only host can delete trip)
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Fetch user details
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the user is the host or an admin
    if (trip.host.toString() !== req.user.userId && !user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Only the host or an admin can delete the trip" });
    }

    await trip.deleteOne();
    res.json({ message: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/trips/[TripID]/copy
exports.copyTrip = async (req, res) => {
  try {
    const originalTrip = await Trip.findById(req.params.id);
    if (!originalTrip)
      return res.status(404).json({ message: "Trip not found" });
    const copiedTrip = new Trip({
      title: originalTrip.title,
      description: originalTrip.description,
      metadata: originalTrip.metadata,
      itinerary: originalTrip.itinerary,
      packingEssentials: originalTrip.packingEssentials,
      estimatedBudget: originalTrip.estimatedBudget,
      tags: originalTrip.tags,
      isPublic: originalTrip.isPublic,
      status: originalTrip.status,
      coverPhoto: originalTrip.coverPhoto,
      photos: originalTrip.photos,
      host: req.user.userId,
      members: [{ user: req.user.userId, role: "host", status: "accepted" }],
    });
    await copiedTrip.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { tripHistory: copiedTrip._id },
    });
    res.status(201).json(copiedTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/trips/[TripID]/invite
exports.inviteMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (trip.host.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Only the host can invite members" });
    }

    if (trip.members.some((m) => m.user.toString() === memberId)) {
      return res.status(200).json({ message: "User already invited or a member" });
    }

    // Find the member being invited to get their push token
    const invitedMember = await User.findById(memberId);
    if (!invitedMember) {
      return res.status(404).json({ message: "Invited user not found" });
    }

    // Add member with pending status
    trip.members.push({ user: memberId, role: "viewer", status: "pending" });
    await trip.save();

    // Create a notification for the invited user
    await Notification.create({
      userId: memberId, // User who gets the notification
      tripId: trip._id, // Trip for which they were invited
      message: `You have been invited to join the trip: ${trip.title}`, // Custom message
      type: "invitation"
    });

    // Send push notification if user has a push token
    if (invitedMember.expoPushToken) {
      await sendPushNotification(
        [invitedMember.expoPushToken], // Array of tokens
        'New Trip Invitation',
        `You've been invited to join ${trip.title}!`,
        { tripId: trip._id }
      );
    }

    res.status(201).json({ message: "Invitation sent and notification created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/trips/[TripID]/respond
exports.respondToInvitation = async (req, res) => {
  try {
    const { action } = req.body; //"accept" or "reject"
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    const member = trip.members.find(
      (m) => m.user.toString() === req.user.userId
    );
    if (!member) {
      return res
        .status(400)
        .json({ message: "No invitation found for this user" });
    }
    if (member.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Invitation already responded to" });
    }
    if (action === "accept") {
      member.status = "accepted";
      await User.findByIdAndUpdate(req.user.userId, {
        $push: { tripHistory: trip._id },
      });
    } else if (action === "reject") {
      member.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
    await trip.save();
    res.json({ message: `Invitation ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/trips/[TripID]/leave  (host cannot leave trip)
exports.leaveTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.host.toString() === req.user.userId) {
      return res.status(400).json({ message: "Host cannot leave the trip" });
    }
    const memberIndex = trip.members.findIndex(
      (m) => m.user.toString() === req.user.userId && m.status === "accepted"
    );
    if (memberIndex === -1) {
      return res
        .status(400)
        .json({ message: "You are not an active member of this trip" });
    }
    trip.members.splice(memberIndex, 1);
    await trip.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { tripHistory: trip._id },
    });
    res.json({ message: "Left the trip successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/trips/open
exports.getOpenTrips = async (req, res) => {
  try {
    const openTrips = await Trip.find({ isPublic: true })
      .populate("host")
      .populate("members.user");
    res.json(openTrips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST /api/trips/[TripID]/join  (for open trips)
exports.joinTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (!trip.isPublic) {
      return res
        .status(403)
        .json({ message: "This trip is private; you must be invited." });
    }

    if (trip.members.some((m) => m.user.toString() === req.user.userId)) {
      return res
        .status(200)
        .json({ message: "You have already requested to join this trip" });
    }

    trip.members.push({
      user: req.user.userId,
      role: "viewer",
      status: "pending",
    });

    await trip.save();

    let newNotification = {
      userId: trip.host, // Assuming trip.host is the host's ObjectId
      tripId: trip._id,
      message: `${req.user.name} has requested to join your trip.`,
      type: "request",
      requestMadeBy: req.user.userId,
    }
    // Create a notification for the trip host
    await Notification.create(newNotification);

    // Send notification to trip host
    await sendPushNotification(
      [trip.host.expoPushToken],
      'New Join Request',
      `${req.user.name} wants to join your trip!`,
      { tripId: trip._id }
    );

    res.status(201).json({ message: "Join request sent successfully", trip, newNotification});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/trips/:id/change-role
exports.changeMemberRole = async (req, res) => {
  try {
    const { memberId, newRole } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (trip.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the host can change member roles" });
    }

    const member = trip.members.find((m) => m.user.toString() === memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found in this trip" });
    }

    if (member.user.toString() === trip.host.toString()) {
      return res
        .status(400)
        .json({ message: "The host's role cannot be changed" });
    }

    if (!["viewer", "editor"].includes(newRole)) {
      return res
        .status(400)
        .json({ message: "Invalid role. Use 'viewer' or 'editor'" });
    }

    member.role = newRole;
    await trip.save();

    res.json({ message: `Member role updated to ${newRole}`, trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/trips/my-trips
exports.getAcceptedTripsForUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required in the request body" });
    }
    // Find trips where the members array contains an entry for userId with status "accepted"
    const trips = await Trip.find({
      members: { $elemMatch: { user: userId, status: "accepted" } }
    })
      .populate("host")
      .populate("members.user");
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//PUT /api/trips/[TripID]/remove-cover
exports.removeCoverPhoto = async (req, res) => {
  console.log("Removing cover photo");
  try {
    const defaultCoverPhoto =
      "https://media.istockphoto.com/id/1381637603/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=w64j3fW8C96CfYo3kbi386rs_sHH_6BGe8lAAAFS-y4="; // Default cover photo URL

    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId, // Trip ID from URL params
      { coverPhoto: defaultCoverPhoto },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ message: "Cover photo removed", coverPhoto: trip.coverPhoto });
  } catch (err) {
    console.error("Error removing cover photo:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

//PUT /api/trips/[TripID]/update-cover
exports.updateCoverPhoto = async (req, res) => {
  console.log("Updating cover photo");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload new cover photo to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "trip-covers",
    });

    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId, // Trip ID from URL params
      { coverPhoto: result.secure_url }, // Set new Cloudinary URL
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ message: "Cover photo updated", coverPhoto: trip.coverPhoto });
  } catch (err) {
    console.error("Error updating cover photo:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// GET /api/trips/search?query=...
exports.searchTrips = async (req, res) => {
  try {
    const {query} = req.query;
    let matchCriteria = {};

    let trips = await Trip.find(matchCriteria)
      .lean()
      .populate("host", "name email photo")
      .populate("members.user", "name email");
    if (query) {
      const fuse = new Fuse(trips, {
        keys: [
          { name: "title", weight: 0.9 },
          { name: "description", weight: 0.8, getFn: (obj) => obj.description || "" },
          { name: "metadata.destination", weight: 0.7, getFn: (obj) => obj.metadata?.destination || "" },
          { name: "host.name", weight: 0.6, getFn: (obj) => obj.host?.name || "" },
          { name: "tags", weight: 0.5, getFn: (obj) => Array.isArray(obj.tags) ? obj.tags.join(" ") : "" },
        ],
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: false,
      });
      const fuseResults = fuse.search(query);

      fuseResults.sort((a, b) => a.score - b.score);

      trips = fuseResults.map((result) => result.item);
    }
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// //POST /api/trips/[tripID]/join-request/[userId]
// exports.handleJoinRequest = async (req, res) => {
//   try {
//     const { tripId, userId } = req.params;
//     const { response } = req.body; // expected to be "accept" or "reject"

//     const trip = await Trip.findById(tripId);
//     if (!trip) return res.status(404).json({ message: "Trip not found" });

//     // Check if the request is coming from the trip host
//     if (trip.host.toString() !== req.user.userId) {
//       return res.status(403).json({ message: "Only the host can manage join requests" });
//     }

//     // Find the member with a pending status
//     const member = trip.members.find((m) => m.user.toString() === userId && m.status === "pending");
//     if (!member) {
//       return res.status(400).json({ message: "No pending request found for this user" });
//     }

//     if (response === "accept") {
//       member.status = "accepted"; // Approve the request
//     } else if (response === "reject") {
//       // Remove the user from the members list
//       trip.members = trip.members.filter((m) => m.user.toString() !== userId);
//     } else {
//       return res.status(400).json({ message: "Invalid response. Use 'accept' or 'reject'" });
//     }

//     await trip.save();

//     // Delete the notification related to this join request
//     await Notification.findOneAndDelete({ tripId, userId });

//     res.json({ message: `User has been ${response}ed successfully.` });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
