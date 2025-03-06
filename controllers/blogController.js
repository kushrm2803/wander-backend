const BlogPost = require("../models/BlogPost");
const User = require("../models/User");
const Trip = require("../models/Trip");

//POST api/blogs
exports.createBlogPost = async (req, res) => {
  try {
    const { tripId, caption, photos, content } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip)
      return res.status(404).json({ message: "Trip not found" });
    
    const isHost = trip.host.toString() === req.user.userId;
    const isMember = trip.members.some(
      (m) =>
        m.user.toString() === req.user.userId && m.status === "accepted"
    );
    if (!isHost && !isMember) {
      return res
        .status(403)
        .json({ message: "You are not a participant of this trip" });
    }
    
    const blogPost = new BlogPost({
      trip: trip._id,
      host: req.user.userId, // the user posting the blog
      caption,
      photos,
      content
    });
    await blogPost.save();
    
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { publicPosts: blogPost._id }
    });
    
    res.status(201).json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//GET api/blogs
exports.getBlogPosts = async (req, res) => {
  try {
    const blogPosts = await BlogPost.find()
      .populate("trip")
      .populate("host", "name email")
      .populate("ratings.user", "name email");
    res.json(blogPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//GET api/blogs/[id]
exports.getBlogPostById = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id)
      .populate("trip")
      .populate("host", "name email")
      .populate("ratings.user", "name email");
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });
    res.json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//PUT api/blogs/[id]
exports.updateBlogPost = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });
    if (blogPost.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this blog post" });
    }
    const { caption, photos, content } = req.body;
    if (caption !== undefined) blogPost.caption = caption;
    if (photos !== undefined) blogPost.photos = photos;
    if (content !== undefined) blogPost.content = content;
    await blogPost.save();
    res.json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//DELETE api/blogs/[id]
exports.deleteBlogPost = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });
    if (blogPost.host.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this blog post" });
    }
    await blogPost.deleteOne();
    res.json({ message: "Blog post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST api/blogs/[id]/rate
exports.rateBlog = async (req, res) => {
  try {
    const blogId = req.params.id;
    const { value } = req.body;
    if (!value || value < 1 || value > 5) {
      return res
        .status(400)
        .json({ message: "Rating value must be between 1 and 5" });
    }
    const blogPost = await BlogPost.findById(blogId);
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });
    const existingRatingIndex = blogPost.ratings.findIndex(
      rating => rating.user.toString() === req.user.userId
    );
    if (existingRatingIndex !== -1) {
      blogPost.ratings[existingRatingIndex].value = value;
    } else {
      blogPost.ratings.push({ user: req.user.userId, value });
    }
    await blogPost.save();
    res.json({ message: "Rating submitted successfully", blogPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//PUT api/blogs/[id]/rate
exports.updateRating = async (req, res) => {
  try {
    const blogId = req.params.id;
    const { value } = req.body;
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ message: "Rating value must be between 1 and 5" });
    }
    const blogPost = await BlogPost.findById(blogId);
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });

    // Find the existing rating by this user
    const ratingIndex = blogPost.ratings.findIndex(
      rating => rating.user.toString() === req.user.userId
    );
    if (ratingIndex === -1) {
      return res.status(404).json({ message: "Rating not found for update, use POST to create" });
    }
    blogPost.ratings[ratingIndex].value = value;
    await blogPost.save();
    res.json({ message: "Rating updated successfully", blogPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
