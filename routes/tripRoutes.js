const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, tripController.createTrip);
router.get("/:id", authMiddleware, tripController.getTrip);
router.put("/:id", authMiddleware, tripController.updateTrip);
router.delete("/:id", authMiddleware, tripController.deleteTrip);
router.post("/:id/copy", authMiddleware, tripController.copyTrip);

router.post("/:id/invite", authMiddleware, tripController.inviteMember);
router.post("/:id/respond", authMiddleware, tripController.respondToInvitation);
router.post("/:id/leave", authMiddleware, tripController.leaveTrip);

router.get("/", authMiddleware, tripController.searchTrips);

module.exports = router;
