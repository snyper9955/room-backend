const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    type: {
      type: String, // Single, Double, AC, Non-AC
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "occupied"],
      default: "available",
      lowercase: true,
      trim: true,
    },
    amenities: [
      {
        type: String, // WiFi, Bed, AC, etc.
      },
    ],
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    description: {
      type: String,
    },
    occupiedUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);