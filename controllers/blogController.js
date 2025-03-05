const BlogPost = require("../models/BlogPost");
const Trip = require("../models/Trip");
const User = require("../models/User");

exports.createBlogPost = async (req, res) => {
  try {
    const { tripId, caption, photos, content } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip)
      return res.status(404).json({ message: "Trip not found" });
    if (trip.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the host can post a blog for this trip" });
    }
    const blogPost = new BlogPost({
      trip: trip._id,
      host: req.user.userId,
      caption,
      photos,
      content,
    });
    await blogPost.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { publicPosts: blogPost._id },
    });
    res.status(201).json(blogPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBlogPosts = async (req, res) => {
  try {
    const blogPosts = await BlogPost.find()
      .populate("trip")
      .populate("host");
    res.json(blogPosts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
