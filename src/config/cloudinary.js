const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_FORMATS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const removeFromCloudinary = async (publicId) => {
  if (publicId) await cloudinary.uploader.destroy(publicId);
};

class CloudinaryStorage {
  _handleFile(req, file, cb) {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "backend-users", allowed_formats: Object.values(ALLOWED_FORMATS) },
      (error, result) => {
        if (error) return cb(error);
        cb(null, { path: result.secure_url, filename: result.public_id });
      }
    );
    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    removeFromCloudinary(file.filename).then(() => cb(null)).catch(cb);
  }
}

const fileFilter = (req, file, cb) => {
  if (file.mimetype in ALLOWED_FORMATS) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: new CloudinaryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

module.exports = { cloudinary, upload, removeFromCloudinary };