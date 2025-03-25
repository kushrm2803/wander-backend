const mongoose = require("mongoose");

const BlogViewLogSchema = new mongoose.Schema({
  userIp: { type: String, required: true },
  blogId: { type: mongoose.Schema.Types.ObjectId, ref: "BlogPost", required: true },
  lastViewed: { type: Date, default: Date.now }
});

module.exports = mongoose.model("BlogViewLog", BlogViewLogSchema);
