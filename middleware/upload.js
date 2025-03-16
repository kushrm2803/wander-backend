const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = "uploads"; // Default folder
    if (file.fieldname === "coverPhoto") folderName = "trip-covers";
    if (file.fieldname === "tripPhotos") folderName = "trip-photos";
    if (file.fieldname === "photo") folderName = "profile-photos";

    return {
      folder: folderName,
      format: "jpg",
      public_id: `user-${req.user.userId}-${Date.now()}`
    };
  }
});

const upload = multer({ storage, limits: {filesize: 35*1024*1024} });

module.exports = upload;
