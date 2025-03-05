const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answerText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const QuestionSchema = new mongoose.Schema({
  blog: { type: mongoose.Schema.Types.ObjectId, ref: "BlogPost", required: true },
  askedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionText: { type: String, required: true },
  answers: [AnswerSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Question", QuestionSchema);
