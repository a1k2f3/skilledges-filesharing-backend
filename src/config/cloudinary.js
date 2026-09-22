const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { v2: cloudinary } = require("cloudinary");

const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "svg"
]);

const videoExtensions = new Set([
  "mp4",
  "mov",
  "avi",
  "webm",
  "mkv"
]);

// Embroidery / machine design files
const embroideryExtensions = new Set([
  "ngs",
  "emb",
  "dst"
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || "skilledges-files",
        resource_type: "auto",
        ...options
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

const getResourceType = (filename) => {
  const extension = filename.split(".").pop().toLowerCase();

  if (imageExtensions.has(extension)) {
    return "image";
  }

  if (videoExtensions.has(extension)) {
    return "video";
  }

  // Embroidery files are stored as raw files
  if (embroideryExtensions.has(extension)) {
    return "raw";
  }

  // Other documents/files
  return "raw";
};

module.exports = {
  cloudinary,
  uploadBuffer,
  getResourceType
};