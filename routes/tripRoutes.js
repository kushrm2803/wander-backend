const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// GET /api/trips/open
router.get("/open", authMiddleware, tripController.getOpenTrips);
// POST /api/trips/my-trips
router.post("/my-trips", authMiddleware, tripController.getAcceptedTripsForUser);
// POST /api/trips
router.post("/", authMiddleware, upload.fields([
  { name: "coverPhoto", maxCount: 1 }, // Accept only one cover photo
  { name: "tripPhotos", maxCount: 15 }, // Accept up to 10 photos
]), tripController.createTrip);
//PUT /api/trips/[TripID]/remove-cover
router.put("/:tripId/remove-cover", authMiddleware, tripController.removeCoverPhoto);
// GET /api/trips/[TripID]
router.get("/:id", authMiddleware, tripController.getTrip);
// PUT /api/trips/[TripID]
router.put("/:id", authMiddleware, tripController.updateTrip);
// DELETE /api/trips/[TripID]
router.delete("/:id", authMiddleware, tripController.deleteTrip);
// POST /api/trips/[TripID]/copy
router.post("/:id/copy", authMiddleware, tripController.copyTrip);
// POST /api/trips/[TripID]/invite
router.post("/:id/invite", authMiddleware, tripController.inviteMember);
// POST /api/trips/[TripID]/respond
router.post("/:id/respond", authMiddleware, tripController.respondToInvitation);
// POST /api/trips/[TripID]/leave
router.post("/:id/leave", authMiddleware, tripController.leaveTrip);
// POST /api/trips/[TripID]/join
router.post("/:id/join", authMiddleware, tripController.joinTrip);
// POST /api/trips/[TripID]/change-role
router.post(
  "/:id/change-role",
  authMiddleware,
  tripController.changeMemberRole
);
//PUT /api/trips/[TripID]/update-cover
router.put(
  "/:tripId/update-cover",
  authMiddleware,
  upload.single("coverPhoto"), // Accept a single file upload
  tripController.updateCoverPhoto
);
module.exports = router;
