const User = require("../models/User");

//GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("friends")
      .populate("tripHistory")
      .populate("publicPosts");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST /api/users/add-friend
exports.addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findById(req.user.userId);
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ message: "Friend already added" });
    }
    user.friends.push(friendId);
    await user.save();
    res.json({ message: "Friend added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
