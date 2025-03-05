const Trip = require("../models/Trip");
const User = require("../models/User");

// POST /api/trips
exports.createTrip = async (req, res) => {
  try {
    const {
      title,
      description,
      metadata,
      itinerary,
      packingEssentials,
      estimatedBudget,
      tags,
      isPublic,
      status,
      coverPhoto,
      photos,
    } = req.body;

    const trip = new Trip({
      title,
      description,
      metadata,
      itinerary,
      packingEssentials,
      estimatedBudget,
      tags,
      isPublic,
      status: status || "planning",
      coverPhoto,
      photos,
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

//GET /api/trips/[TripID]
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

//PUT /api/trips/[TripID]
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

//DELETE /api/trips/[TripID]  (only host can delele trip)
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

//POST /api/trips/[TripID]/copy
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

//POST /api/trips/[TripID]/invite
exports.inviteMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the host can invite members" });
    }
    if (trip.members.some((m) => m.user.toString() === memberId)) {
      return res
        .status(400)
        .json({ message: "User already invited or a member" });
    }
    trip.members.push({ user: memberId, role: "viewer", status: "pending" });
    await trip.save();
    res.json({ message: "Invitation sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST /api/trips/[TripID]/respond
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

//POST /api/trips/[TripID]/leave  (host cannot leave trip)
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

//GET /api/trips?query={query which is search}&tags={tag which is applied} (based on search parameters)
exports.searchTrips = async (req, res) => {
  try {
    const { query, tags } = req.query;
    let searchCriteria = {};
    if (!req.user) {
      searchCriteria.isPublic = true;
    } else {
      searchCriteria.$or = [
        { isPublic: true },
        { "members.user": req.user.userId, "members.status": "accepted" },
      ];
    }
    if (query) {
      searchCriteria.$or.push(
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "metadata.destination": { $regex: query, $options: "i" } }
      );
    }
    if (tags) {
      const tagsArray = tags.split(",");
      searchCriteria.tags = { $in: tagsArray };
    }
    const trips = await Trip.find(searchCriteria)
      .populate("host")
      .populate("members.user");
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
