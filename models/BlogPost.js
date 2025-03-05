const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String },
});

const BlogPostSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String },
    photos: [PhotoSchema],
    content: { type: String }, // optional detailed blog content
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);
