const Question = require("../models/Questions");
const BlogPost = require("../models/BlogPost");
const Notification = require("../models/Notifications");
const User = require("../models/User");

const createAlertNotification = async (userId, blogId, message) => {
  try {
    const alert = new Notification({
      userId,
      tripId: blogId,
      message,
      type: "blogalert",
    });
    await alert.save();
  } catch (error) {
    console.error("Error creating alert notification:", error);
  }
};

//POST /api/questions/ask (blogid passed in body)
exports.askQuestion = async (req, res) => {
  try {
    const { blogId, questionText } = req.body;
    const question = new Question({
      blog: blogId,
      askedBy: req.user.userId,
      questionText,
      answers: [],
    });
    await question.save();
    const blog = await BlogPost.findById(blogId);
    const user = await User.findById(req.user.userId);

    if (blog && blog.host.toString() !== req.user.userId) {
      await createAlertNotification(
        blog.host,
        blogId,
        `${user.name} asked a question on your blog post.`
      );
    }

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//POST /api/questions/[id]/answer
exports.answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answerText } = req.body;
    const question = await Question.findById(questionId);
    if (!question)
      return res.status(404).json({ message: "Question not found" });
    question.answers.push({
      answeredBy: req.user.userId,
      answerText,
    });
    await question.save();
    const user = await User.findById(req.user.userId);

    if (question.askedBy.toString() !== req.user.userId) {
      await createAlertNotification(
        question.askedBy,
        question.blog,
        `${user.name} answered your question on a blog post.`
      );
    }
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//GET /api/questions/blog/[id]
exports.getQuestions = async (req, res) => {
  try {
    const { blogId } = req.params;
    const questions = await Question.find({ blog: blogId })
      .populate("askedBy", "name email photo")
      .populate("answers.answeredBy", "name email photo");
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
