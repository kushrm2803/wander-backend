const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String }
});

const RatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, required: true, min: 1, max: 5 }
});

const ConcernsSchema = new mongoose.Schema({
  womenSafety: { type: Number, min: 1, max: 5 },
  affordability: { type: Number, min: 1, max: 5 },
  culturalExperience: { type: Number, min: 1, max: 5 },
  accessibility: { type: Number, min: 1, max: 5 }
}, { _id: false });

const BlogPostSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: false },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    title: { type: String, required: true },
    summary: { type: String },
    description: { type: String },
    recommendations: { type: String },
    advisory: { type: String },              // Advisory & suggestions
    
    coverPhoto: { type: String },
    photos: [PhotoSchema],
    
    contactInfo: [{
      label: { type: String },
      phone: { type: String },
      email: { type: String }
    }],
    
    tags: [String],
    
    budget: { type: Number },
    
    concerns: ConcernsSchema,
    
    // // SEO fields
    // slug: { type: String },
    // metaTitle: { type: String },
    // metaDescription: { type: String },
    
    ratings: [RatingSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);
