const cloudinary = require('cloudinary').v2;
let cloud_name =  process.env.CLOUD_NAME
let api_key = process.env.CLOUD_KEY
let api_secret = process.env.CLOUD_SECRET

cloudinary.config({
  cloud_name,
  api_key,
  api_secret
});

module.exports = cloudinary;
