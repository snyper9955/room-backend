const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String, // Razorpay payment ID
      trim: true,
    },
    orderId: {
      type: String, // Razorpay order ID
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      lowercase: true,
      trim: true,
    },
    method: {
      type: String, // UPI, Card, Cash
      lowercase: true,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);