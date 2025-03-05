const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const authMiddleware = require("../middleware/authMiddleware");

// Ask a question about a blog post
router.post("/ask", authMiddleware, questionController.askQuestion);
// Answer a question
router.post("/:questionId/answer", authMiddleware, questionController.answerQuestion);
// Get all questions for a blog post
router.get("/blog/:blogId", questionController.getQuestions);

module.exports = router;
