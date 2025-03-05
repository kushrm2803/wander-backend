const Question = require("../models/Questions");

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
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answerText } = req.body;
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });
    question.answers.push({
      answeredBy: req.user.userId,
      answerText,
    });
    await question.save();
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { blogId } = req.params;
    const questions = await Question.find({ blog: blogId })
      .populate("askedBy", "name email")
      .populate("answers.answeredBy", "name email");
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
