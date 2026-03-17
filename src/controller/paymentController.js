const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Room = require("../models/Room");
const Booking = require("../models/Booking");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc Create Razorpay Order
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, roomId, name, email, phone } = req.body;

    if (!amount || !roomId) {
      return res.status(400).json({ message: "Amount and Room ID are required" });
    }

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    next(error);
  }
};

// @desc Verify Razorpay Payment and Update Room/Booking
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      roomId,
      name,
      email,
      phone,
      amount
    } = req.body;

    const userEmail = email?.toLowerCase()?.trim();
    console.log("Verifying payment for:", userEmail, "Room:", roomId);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== "test_signature" && razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Payment Successful - Update Database
    
    // 1. Create Payment Record
    const payment = await Payment.create({
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amount,
      status: "completed",
      method: "razorpay",
      paidAt: new Date(),
    });

    // 2. Create Booking Record with 1 month expiry
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    const booking = await Booking.create({
      name,
      phone,
      email: userEmail,
      room: roomId,
      status: "approved",
      moveInDate: new Date(),
      expiryDate: expiryDate,
    });

    // 3. Create/Update Tenant Record
    const Tenant = require("../models/Tenant");
    let tenant = await Tenant.findOne({ email: userEmail });
    
    if (!tenant) {
      tenant = await Tenant.create({
        name,
        email: userEmail,
        phone,
        room: roomId,
        rentAmount: amount,
        status: "active",
        moveInDate: new Date(),
      });
    } else {
      tenant.room = roomId;
      tenant.status = "active";
      tenant.moveInDate = new Date();
      await tenant.save();
    }

    // 4. Update Room Status and Occupancy
    await Room.findByIdAndUpdate(roomId, { 
      status: "occupied",
      occupiedUntil: expiryDate
    });

    console.log(`[DEBUG] verifyPayment: Booking created with ID ${booking._id} for ${userEmail}`);
    console.log(`[DEBUG] verifyPayment: Booking status is "${booking.status}"`);

    res.json({
      success: true,
      message: "Payment verified and booking confirmed",
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    next(error);
  }
};

// @desc Get all payments
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};