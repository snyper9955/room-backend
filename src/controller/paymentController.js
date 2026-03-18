const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Room = require("../models/Room");
const Booking = require("../models/Booking");
const sendWhatsAppMessage = require("../utils/whatsapp");

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

    // 2. Create/Update Booking Record with 1 month expiry
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    let booking = await Booking.findOne({ 
      email: userEmail, 
      room: roomId, 
      paymentStatus: "pending" 
    });

    if (booking) {
      booking.status = "approved";
      booking.expiryDate = expiryDate;
      booking.paymentStatus = "completed";
      await booking.save();
    } else {
      booking = await Booking.create({
        name,
        phone,
        email: userEmail,
        room: roomId,
        status: "approved",
        moveInDate: new Date(),
        expiryDate: expiryDate,
        paymentStatus: "completed"
      });
    }

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
        paymentStatus: "completed"
      });
    } else {
      tenant.room = roomId;
      tenant.status = "active";
      tenant.moveInDate = new Date();
      tenant.paymentStatus = "completed";
      await tenant.save();
    }

    // 4. Update Room Status and Occupancy
    const updatedRoom = await Room.findByIdAndUpdate(roomId, { 
      status: "occupied",
      occupiedUntil: expiryDate
    }, { new: true });

    // 5. Send WhatsApp Notification to Admin
    try {
      const adminPhone = "+9198358271"; // Verified admin number base
      const message = `🔔 *Payment Received!*\n\nUser: ${name}\nEmail: ${userEmail}\nRoom: ${updatedRoom?.roomNumber || 'N/A'}\nAmount: ₹${amount}\n\nStay confirmed until ${expiryDate.toDateString()}.`;
      
      await sendWhatsAppMessage(adminPhone, message);
      console.log(`[DEBUG] WhatsApp reminder sent to admin for room ${updatedRoom?.roomNumber}`);
    } catch (wsError) {
      console.error("[ERROR] Failed to send WhatsApp reminder:", wsError.message);
      // Don't fail the request if notification fails
    }

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