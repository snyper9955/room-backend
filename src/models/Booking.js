const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "vacated"],
      default: "pending",
      lowercase: true,
      trim: true,
    },
    moveInDate: {
      type: Date,
    },
    message: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
      default: function() {
        if (this.moveInDate) {
          const date = new Date(this.moveInDate);
          date.setDate(date.getDate() + 30);
          return date;
        }
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      }
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);