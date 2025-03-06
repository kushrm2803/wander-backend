const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const authMiddleware = require("../middleware/authMiddleware");

//POST /api/questions/ask
router.post("/ask", authMiddleware, questionController.askQuestion);
//POST /api/questions/[id]/answer
router.post("/:questionId/answer", authMiddleware, questionController.answerQuestion);
//GET /api/questions/blog/[id]
router.get("/blog/:blogId", questionController.getQuestions);

module.exports = router;
