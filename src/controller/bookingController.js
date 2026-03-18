const Booking = require("../models/Booking");

// @desc Create booking
exports.createBooking = async (req, res, next) => {
  try {
    const { name, phone, email, roomId, moveInDate, message } = req.body;

    const booking = await Booking.create({
      name: name?.trim(),
      phone: phone?.trim(),
      email: email?.toLowerCase()?.trim(),
      room: roomId,
      moveInDate,
      message: message?.trim(),
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc Get bookings
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate("room");
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// @desc Get current user's bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "User not identified" });
    }

    const userEmail = req.user.email.toLowerCase().trim();
    const Booking = require("../models/Booking");
    const Tenant = require("../models/Tenant");

    const [bookings, tenants] = await Promise.all([
      Booking.find({ email: userEmail }).populate("room"),
      Tenant.find({ email: userEmail })
    ]);

    // Deduplicate bookings: one stay per room
    const roomMap = new Map();
    
    // Sort so we process better status first (completed payment wins)
    const sortedBookings = bookings.sort((a, b) => {
      // 1. Completed payment first
      if (a.paymentStatus === 'completed' && b.paymentStatus !== 'completed') return -1;
      if (a.paymentStatus !== 'completed' && b.paymentStatus === 'completed') return 1;
      // 2. Most recent first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    for (const booking of sortedBookings) {
      if (!booking.room) continue;
      const roomIdStr = booking.room._id.toString();
      
      // If we don't have this room yet, or if it's a better status, keep it
      if (!roomMap.has(roomIdStr)) {
        const bookingObj = booking.toObject();
        const tenantData = tenants.find(t => 
          t.room && t.room.toString() === roomIdStr
        );

        roomMap.set(roomIdStr, {
          ...bookingObj,
          rentAmount: tenantData ? tenantData.rentAmount : (booking.room?.price || 0),
          tenantStatus: tenantData ? tenantData.status : 'pending',
          joiningDate: tenantData ? (tenantData.joinDate || tenantData.moveInDate) : booking.createdAt
        });
      }
    }
    
    res.json(Array.from(roomMap.values()));
  } catch (error) {
    next(error);
  }
};

// @desc Update booking status
exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = req.body.status?.toLowerCase()?.trim();
    await booking.save();

    res.json(booking);
  } catch (error) {
    next(error);
  }
};