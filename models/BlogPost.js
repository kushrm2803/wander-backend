const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String }
});

const RatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, required: true, min: 1, max: 5 }
});

const BlogPostSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    caption: { type: String },
    photos: [PhotoSchema],
    content: { type: String },
    ratings: [RatingSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);
