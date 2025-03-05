const express = require("express");
const router = express.Router();
const { getProfile, addFriend } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

//GET /api/users/profile
router.get("/profile", authMiddleware, getProfile);
//POST /api/users/add-friend
router.post("/add-friend", authMiddleware, addFriend);

module.exports = router;
