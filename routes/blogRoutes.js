const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/search", authMiddleware, blogController.searchBlogs);
//POST api/blogs
router.post("/", authMiddleware, upload.fields([
    { name: "blogCoverPhoto", maxCount: 1 }, // Accept only one cover photo
    { name: "blogPhotos", maxCount: 15 }, // Accept up to 15 photos
  ]), blogController.createBlogPost);
//GET api/blogs
router.get("/", blogController.getBlogPosts);
//GET api/blogs/[id]
router.get("/:id", blogController.getBlogPostById);
//PUT api/blogs/[id]
router.put("/:id", authMiddleware, blogController.updateBlogPost);
//DELETE api/blogs/[id]
router.delete("/:id", authMiddleware, blogController.deleteBlogPost);
//POST api/blogs/[id]/rate
router.post("/:id/rate", authMiddleware, blogController.rateBlog);
//PUT api/blogs/[id]/rate
router.put("/:id/rate", authMiddleware, blogController.updateRating);


module.exports = router;
