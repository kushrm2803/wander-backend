const cloudinary = require("../config/cloudinary");
const Trip = require("../models/Trip");
const User = require("../models/User");
const Notification = require("../models/Notifications")

// POST /api/trips
exports.createTrip = async (req, res) => {
  try {
    // If the fields come in as JSON strings, parse them
    if (typeof req.body.metadata === 'string') {
      req.body.metadata = JSON.parse(req.body.metadata);
    }
    if (typeof req.body.itinerary === 'string') {
      req.body.itinerary = JSON.parse(req.body.itinerary);
    }
    if (typeof req.body.packingEssentials === 'string') {
      req.body.packingEssentials = JSON.parse(req.body.packingEssentials);
    }
    if (typeof req.body.tags === 'string') {
      // Depending on how you send tags, you might want to split or parse
      try {
        req.body.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // If parsing fails, treat it as a comma-separated string
        req.body.tags = req.body.tags.split(",").map(t => t.trim());
      }
    }

    // Extract coverPhoto from req.body (or leave it to be replaced below)
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

    // Check that required fields are present (e.g. title)
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Process coverPhoto file upload from FormData if available
    if (req.files && req.files["coverPhoto"]) {
      const result = await cloudinary.uploader.upload(req.files["coverPhoto"][0].path, {
        folder: "trip-covers",
      });
      coverPhoto = result.secure_url; // Replace coverPhoto with the Cloudinary URL
    }

    // Create the Trip document
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
      host: req.user.userId,
      members: [{ user: req.user.userId, role: "host", status: "accepted" }],
    });

    await trip.save();

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
    if (trip.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the host can delete the trip" });
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
      return res.status(400).json({ message: "User already invited or a member" });
    }

    // Add member with pending status
    trip.members.push({ user: memberId, role: "viewer", status: "pending" });
    await trip.save();

    // Create a notification for the invited user
    await Notification.create({
      userId: memberId, // User who gets the notification
      tripId: trip._id, // Trip for which they were invited
      message: `You have been invited to join the trip: ${trip.title}`, // Custom message
    });

    res.json({ message: "Invitation sent and notification created" });
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
        .status(400)
        .json({ message: "You are already a member of this trip" });
    }
    trip.members.push({
      user: req.user.userId,
      role: "viewer",
      status: "accepted",
    });
    await trip.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { tripHistory: trip._id },
    });
    res.json({ message: "You have joined the trip successfully", trip });
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
