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
    
    coverPhoto: { type: String , default: "https://media.istockphoto.com/id/1381637603/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=w64j3fW8C96CfYo3kbi386rs_sHH_6BGe8lAAAFS-y4="},
    photos: [PhotoSchema],
    
    contactInfo: [{
      label: { type: String },
      phone: { type: String },
      email: { type: String }
    }],
    
    tags: [String],
    days: { type: Number},
    budget: { type: Number },
    
    concerns: ConcernsSchema,
    
    // // SEO fields
    // slug: { type: String },
    // metaTitle: { type: String },
    // metaDescription: { type: String },
    
    ratings: [RatingSchema],
    views: { type: Number, default: 0 },

    // blogCoverPhoto: { type: String, default: "https://media.istockphoto.com/id/1381637603/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=w64j3fW8C96CfYo3kbi386rs_sHH_6BGe8lAAAFS-y4=" },
    // blogPhotos: [
    //   {
    //     url: { type: String },
    //     caption: { type: String }
    //   }
    // ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);
