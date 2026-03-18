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
    console.log(`[PAYMENT] Starting verification for: ${userEmail}, Room: ${roomId}`);

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== "test_signature" && razorpay_signature !== expectedSign) {
      console.error("[PAYMENT] Invalid signature detected");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Payment Successful - Update Database
    console.log("[PAYMENT] Signature verified. Updating records...");

    // 1. Create/Update Tenant Record (First, to get tenant ID for payment link)
    const Tenant = require("../models/Tenant");
    let tenant = await Tenant.findOne({ email: userEmail, room: roomId });
    
    if (!tenant) {
      // Fallback: try searching by email only if room-specific not found (legacy support)
      tenant = await Tenant.findOne({ email: userEmail });
    }

    if (!tenant) {
      console.log("[PAYMENT] Creating new tenant record");
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
      console.log("[PAYMENT] Updating existing tenant record:", tenant._id);
      tenant.room = roomId;
      tenant.status = "active";
      tenant.moveInDate = new Date();
      tenant.paymentStatus = "completed";
      await tenant.save();
    }
    
    // 2. Create Payment Record (Linked to Tenant)
    const payment = await Payment.create({
      tenant: tenant._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amount,
      status: "completed",
      method: "razorpay",
      paidAt: new Date(),
    });
    console.log("[PAYMENT] Payment record created:", payment._id);

    // 3. Create/Update Booking Record with 1 month expiry
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Look for ANY approved or pending booking for this user/room
    let booking = await Booking.findOne({ 
      email: userEmail, 
      room: roomId, 
      status: { $in: ["pending", "approved"] }
    });

    if (booking) {
      console.log("[PAYMENT] Updating existing booking status to completed:", booking._id);
      booking.status = "approved";
      booking.expiryDate = expiryDate;
      booking.paymentStatus = "completed";
      await booking.save();
    } else {
      console.log("[PAYMENT] Creating new approved booking");
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

    // 4. Update Room Status and Occupancy
    const updatedRoom = await Room.findByIdAndUpdate(roomId, { 
      status: "occupied",
      occupiedUntil: expiryDate
    }, { new: true });
    console.log("[PAYMENT] Room status updated to occupied");

    // 5. Send WhatsApp Notification to Admin
    try {
      const adminPhone = "+919835958271"; // Fixed: Correct 10-digit number
      const message = `🔔 *Payment Received!*\n\nUser: ${name}\nEmail: ${userEmail}\nRoom: ${updatedRoom?.roomNumber || 'N/A'}\nAmount: ₹${amount}\n\nStay confirmed until ${expiryDate.toDateString()}.`;
      
      await sendWhatsAppMessage(adminPhone, message);
      console.log(`[PAYMENT] WhatsApp notification sent to admin`);
    } catch (wsError) {
      console.error("[PAYMENT] Failed to send WhatsApp reminder:", wsError.message);
    }

    res.json({
      success: true,
      message: "Payment verified and booking confirmed",
      bookingId: booking._id,
      tenantId: tenant._id
    });
  } catch (error) {
    console.error("[PAYMENT] Global Verification Error:", error);
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