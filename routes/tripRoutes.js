const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/trips
router.post("/", authMiddleware, tripController.createTrip);
//GET /api/trips/[TripID]
router.get("/:id", authMiddleware, tripController.getTrip);
//PUT /api/trips/[TripID]
router.put("/:id", authMiddleware, tripController.updateTrip);
//DELETE /api/trips/[TripID]
router.delete("/:id", authMiddleware, tripController.deleteTrip);
//POST /api/trips/[TripID]/copy
router.post("/:id/copy", authMiddleware, tripController.copyTrip);
//POST /api/trips/[TripID]/invite
router.post("/:id/invite", authMiddleware, tripController.inviteMember);
//POST /api/trips/[TripID]/respond
router.post("/:id/respond", authMiddleware, tripController.respondToInvitation);
//POST /api/trips/[TripID]/leave
router.post("/:id/leave", authMiddleware, tripController.leaveTrip);
//GET /api/trips?query={query which is search}&tags={tag which is applied}
router.get("/", authMiddleware, tripController.searchTrips);

module.exports = router;
