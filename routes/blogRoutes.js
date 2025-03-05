const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const authMiddleware = require("../middleware/authMiddleware");

// Create a new blog post
router.post("/", authMiddleware, blogController.createBlogPost);

// Get all blog posts
router.get("/", blogController.getBlogPosts);

module.exports = router;
