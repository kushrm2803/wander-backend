const express = require("express");
const router = express.Router();
const { getProfile, addFriend, updateProfilePhoto } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload")

//GET /api/users/profile
router.get("/profile", authMiddleware, getProfile);
//POST /api/users/add-friend
router.post("/add-friend", authMiddleware, addFriend);
//PUT /api/users/profilephoto
router.put("/profile-photo", authMiddleware, upload.single('photo'), updateProfilePhoto);

module.exports = router;
