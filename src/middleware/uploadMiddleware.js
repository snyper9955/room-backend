const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../uploads"); // Path relative to src/middleware
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Safely configure storage
let storage;
try {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("WARNING: Cloudinary credentials missing. Falling back to local storage.");
    storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    });
  } else {
    storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: "pg-rooms",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
      },
    });
  }
} catch (error) {
  console.error("Error initializing Cloudinary storage:", error);
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
}

// Multer upload
const upload = multer({ storage });

module.exports = { upload };