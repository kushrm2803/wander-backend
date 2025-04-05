const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // For whom the notification is
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true }, // Trip for which they are invited
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    requestMadeBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: false}, 
    type: {
      type: String,
      enum: ["request", "invitation", "alert"],
      default: "invitation"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notifications", notificationSchema);
