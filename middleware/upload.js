const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile-photos", // Folder name in Cloudinary
    format: async (req, file) => "jpg", // Convert to JPG
    public_id: (req, file) => `user-${req.user.userId}-${Date.now()}`
  }
});

const upload = multer({ storage });

module.exports = upload;
