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
};// @desc Get current user's bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      console.log("[DEBUG] getMyBookings: No user or email in request!");
      return res.status(401).json({ message: "User not identified" });
    }

    const userEmail = req.user.email.toLowerCase().trim();
    console.log(`[DEBUG] getMyBookings: Fetching for "${userEmail}" (User ID: ${req.user._id})`);
    
    // Exact match is safer since we normalize everywhere
    const bookings = await Booking.find({ email: userEmail }).populate("room");
    
    console.log(`[DEBUG] getMyBookings: Found ${bookings.length} bookings`);
    if (bookings.length > 0) {
      bookings.forEach((b, i) => {
        console.log(`[DEBUG] Booking ${i}: ID=${b._id}, status="${b.status}", email="${b.email}"`);
      });
    }
    
    res.json(bookings);
  } catch (error) {
    console.error("[DEBUG] getMyBookings Error:", error);
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