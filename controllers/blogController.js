const cloudinary = require("../config/cloudinary");
const BlogPost = require("../models/BlogPost");
const User = require("../models/User");
const Trip = require("../models/Trip");
const BlogViewLog = require("../models/BlogViewLog");
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
    
    if(!title){
      return res.status(400).json({error: "Title is required", title, summary});
    }

    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
    }

    // Upload cover photo if provided
    if (req.files?.blogCoverPhoto) {
      const result = await cloudinary.uploader.upload(req.files.blogCoverPhoto[0].path, {
        folder: "blog-covers",
      });
      blogCoverPhoto = result.secure_url;
    }
    else{
      blogCoverPhoto = "https://media.istockphoto.com/id/1381637603/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=w64j3fW8C96CfYo3kbi386rs_sHH_6BGe8lAAAFS-y4=";
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
          caption: Array.isArray(captions) ? captions[index] || "" : captions || "" // Handle single & multiple captions
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
    const userIp = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress; // Get user IP

    // Check if the user has viewed this blog in the last 10 minutes
    const recentView = await BlogViewLog.findOne({
      userIp,
      blogId,
      lastViewed: { $gte: new Date(Date.now() - 3 * 60 * 1000) } // 3 minutes limit
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
    if (recommendations !== undefined) blogPost.recommendations = recommendations;
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
    let orConditions = [];

    // Search in title, summary, description, recommendations, advisory
    if (query) {
      orConditions.push(
        { title: { $regex: query, $options: "i" } },
        { summary: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { recommendations: { $regex: query, $options: "i" } },
        { advisory: { $regex: query, $options: "i" } }
      );
    }

    // Filter by tags
    if (tags) {
      const tagsArray = tags.split(",").map((tag) => tag.trim());
      matchCriteria.tags = { $in: tagsArray };
    }

    if (orConditions.length > 0) {
      matchCriteria.$or = orConditions;
    }

    const blogs = await BlogPost.find(matchCriteria)
      .populate("trip")
      .populate("host", "name email")
      .populate("ratings.user", "name email");
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
      res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }

};

//GET api/blogs/trendings
exports.getTrendingBlogs = async(req, res) => {
  try {
    // Fetch blogs with engagement metrics
    const blogs = await BlogPost.aggregate([
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "blog",
          as: "questions"
        }
      },
      {
        $addFields: {
          totalQuestions: { $size: "$questions" }, // Count questions
          totalAnswers: {
            $sum: {
              $map: {
                input: "$questions",
                as: "q",
                in: { $size: "$$q.answers" } // Count answers
              }
            }
          },
          avgRating: { $avg: "$ratings.value" }, // Average rating
          ratingCount: { $size: "$ratings" } // Number of ratings
        }
      },
      {
        $addFields: {
          bayesianRating: {
            $divide: [
              {
                $sum: [
                  { $multiply: ["$ratingCount", "$avgRating"] },
                  10 * 3.5 // Prior belief (assumes 10 ratings of 3.5)
                ]
              },
              { $sum: ["$ratingCount", 10] }
            ]
          }
        }
      },
      {
        $addFields: {
          trendingScore: {
            $sum: [
              { $multiply: ["$bayesianRating", 2] }, // Rating weight
              { $multiply: ["$views", 0.1] }, // Views weight
              { $multiply: ["$totalQuestions", 0.5] }, // Question weight
              { $multiply: ["$totalAnswers", 0.75] } // Answer weight, answering shows more engangement
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } }, // Sort by highest trending score
      { $limit: 10 } // Get top 10 trending blogs
    ]);

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};