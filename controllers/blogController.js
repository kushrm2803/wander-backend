const cloudinary = require("../config/cloudinary");
const BlogPost = require("../models/BlogPost");
const User = require("../models/User");
const Trip = require("../models/Trip");
const BlogViewLog = require("../models/BlogViewLog");
const Fuse = require("fuse.js");
const Question = require("../models/Questions");

// POST /api/blogs
exports.createBlogPost = async (req, res) => {
  try {
    // Extract fields from request
    let { blogCoverPhoto } = req.body;
    // console.log(req.body);
    const {
      tripId,
      title,
      summary,
      description,
      recommendations,
      advisory,
      contactInfo,
      tags,
      budget,
      concerns,
    } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ error: "Title is required", title, summary });
    }

    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
    }

    // Upload cover photo if provided
    if (req.files?.blogCoverPhoto) {
      const result = await cloudinary.uploader.upload(
        req.files.blogCoverPhoto[0].path,
        {
          folder: "blog-covers",
        }
      );
      blogCoverPhoto = result.secure_url;
    } else {
      blogCoverPhoto =
        "https://media.istockphoto.com/id/1381637603/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=w64j3fW8C96CfYo3kbi386rs_sHH_6BGe8lAAAFS-y4=";
    }

    // Upload multiple blog photos
    let blogPhotos = [];
    if (req.files?.blogPhotos) {
      const captions = req.body.photosCaptions; // Extract captions from request body

      const uploadPromises = req.files.blogPhotos.map(async (file, index) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "blog-photos",
        });

        return {
          url: result.secure_url,
          caption: Array.isArray(captions)
            ? captions[index] || ""
            : captions || "", // Handle single & multiple captions
        };
      });

      blogPhotos = await Promise.all(uploadPromises);
    }

    // Create blog post document
    const blogPost = new BlogPost({
      trip: tripId || null,
      host: req.user.userId,
      title,
      summary,
      description,
      recommendations,
      advisory,
      coverPhoto: blogCoverPhoto,
      photos: blogPhotos,
      contactInfo,
      tags,
      budget,
      concerns,
    });

    await blogPost.save();

    // Update user's public posts
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { publicPosts: blogPost._id },
    });

    res.status(201).json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/blogs
exports.getBlogPosts = async (req, res) => {
  try {
    const blogPosts = await BlogPost.find()
      .populate("trip")
      .populate("host", "name email photo")
      .populate("ratings.user", "name email")
      .sort({ createdAt: -1 });

    res.json(blogPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/blogs/:id
exports.getBlogPostById = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userIp =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress; // Get user IP

    // Check if the user has viewed this blog in the last 10 minutes
    const recentView = await BlogViewLog.findOne({
      userIp,
      blogId,
      lastViewed: { $gte: new Date(Date.now() - 3 * 60 * 1000) }, // 3 minutes limit
    });

    if (!recentView) {
      // If no recent view, increment the blog's views and log it
      await BlogPost.findByIdAndUpdate(blogId, { $inc: { views: 1 } });

      await BlogViewLog.findOneAndUpdate(
        { userIp, blogId },
        { lastViewed: new Date() },
        { upsert: true } // Create a new entry if none exists
      );
    }

    // Fetch blog details
    const blogPost = await BlogPost.findById(blogId)
      .populate("trip")
      .populate("host", "name email photo")
      .populate("ratings.user", "name email");

    if (!blogPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/blogs/:id
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
    const {
      title,
      summary,
      description,
      recommendations,
      advisory,
      coverPhoto,
      photos,
      contactInfo,
      tags,
      budget,
      concerns,
    } = req.body;
    if (title !== undefined) blogPost.title = title;
    if (summary !== undefined) blogPost.summary = summary;
    if (description !== undefined) blogPost.description = description;
    if (recommendations !== undefined)
      blogPost.recommendations = recommendations;
    if (advisory !== undefined) blogPost.advisory = advisory;
    if (coverPhoto !== undefined) blogPost.coverPhoto = coverPhoto;
    if (photos !== undefined) blogPost.photos = photos;
    if (contactInfo !== undefined) blogPost.contactInfo = contactInfo;
    if (tags !== undefined) blogPost.tags = tags;
    if (budget !== undefined) blogPost.budget = budget;
    if (concerns !== undefined) blogPost.concerns = concerns;

    await blogPost.save();
    res.json(blogPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/blogs/:id
exports.deleteBlogPost = async (req, res) => {
  try {
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost)
      return res.status(404).json({ message: "Blog post not found" });

    // Fetch user details
    // console.log(req.user.userId);
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the user is the blog owner or an admin
    if (blogPost.host.toString() !== req.user.userId && !user?.isAdmin) {
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


// POST /api/blogs/:id/rate
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
      (rating) => rating.user.toString() === req.user.userId
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

// PUT /api/blogs/:id/rate
exports.updateRating = async (req, res) => {
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
    const ratingIndex = blogPost.ratings.findIndex(
      (rating) => rating.user.toString() === req.user.userId
    );
    if (ratingIndex === -1) {
      return res
        .status(404)
        .json({ message: "Rating not found for update, use POST to create" });
    }
    blogPost.ratings[ratingIndex].value = value;
    await blogPost.save();
    res.json({ message: "Rating updated successfully", blogPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/blogs/search?query=...&tags=...
exports.searchBlogs = async (req, res) => {
  try {
    const { query, tags } = req.query;
    let matchCriteria = {};

    // Filter by tags if provided
    if (tags) {
      matchCriteria.tags = { $in: tags.split(",").map((tag) => tag.trim()) };
    }

    let blogs = await BlogPost.find(matchCriteria)
      .lean()
      .populate("trip")
      .populate("host", "name email photo")
      .populate("ratings.user", "name email");

    // Fuzzy search
    if (query) {
      const fuse = new Fuse(blogs, {
        keys: [
          { name: "title", weight: 0.9 },
          { name: "summary", weight: 0.7, getFn: (obj) => obj.summary || "" },
          { name: "description", weight: 0.6, getFn: (obj) => obj.description || "" },
          { name: "advisory", weight: 0.4, getFn: (obj) => obj.advisory || "" },
          { name: "tags", weight: 0.5, getFn: (obj) => Array.isArray(obj.tags) ? obj.tags.join(" ") : "" },
          { name: "host.name", weight: 0.6, getFn: (obj) => obj.host?.name || "" },
        ],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
      });

      const fuseResults = fuse.search(query);
      fuseResults.sort((a, b) => a.score - b.score);
      blogs = fuseResults.map((result) => result.item);
    }

    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//GET /api/blogs/host/[userId]
exports.getBlogsByHost = async (req, res) => {
  try {
    const hostId = req.params.userId;
    // Find blogs where the host matches the given userId
    const blogs = await BlogPost.find({ host: hostId });
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

//GET api/blogs/trendings
exports.getTrendingBlogs = async (req, res) => {
  try {
    const blogs = await BlogPost.aggregate([
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "blog",
          as: "questions",
        },
      },
      {
        $addFields: {
          totalQuestions: { $size: "$questions" },
          totalAnswers: {
            $sum: {
              $map: {
                input: "$questions",
                as: "q",
                in: { $size: "$$q.answers" },
              },
            },
          },
          avgRating: { $avg: "$ratings.value" },
          ratingCount: { $size: "$ratings" },
        },
      },
      {
        $addFields: {
          bayesianRating: {
            $divide: [
              {
                $sum: [{ $multiply: ["$ratingCount", "$avgRating"] }, 10 * 3.5],
              },
              { $sum: ["$ratingCount", 10] },
            ],
          },
        },
      },
      {
        $addFields: {
          logViews: { $log10: { $add: ["$views", 1] } }, // Log scaling for views
          logQuestions: { $log10: { $add: ["$totalQuestions", 1] } }, // Log scaling for questions
          logAnswers: { $log10: { $add: ["$totalAnswers", 1] } }, // Log scaling for answers
        },
      },
      {
        $addFields: {
          trendingScore: {
            $sum: [
              { $multiply: ["$bayesianRating", 5] }, // Ratings contribute directly
              { $multiply: ["$logViews", 1.5] }, // Views scaled down
              { $multiply: ["$logQuestions", 2] }, // Questions scaled down
              { $multiply: ["$logAnswers", 2.5] }, // Answers scaled down
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: 10 },
    ]);

    const populatedBlogs = await BlogPost.populate(blogs, {
      path: "host",
      select: "name email photo",
    });

    res.json(populatedBlogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
