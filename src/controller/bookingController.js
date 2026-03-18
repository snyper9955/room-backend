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
      return res.status(401).json({ message: "User not identified" });
    }

    const userEmail = req.user.email.toLowerCase().trim();
    const Booking = require("../models/Booking");
    const Tenant = require("../models/Tenant");

    const [bookings, tenants] = await Promise.all([
      Booking.find({ email: userEmail }).populate("room"),
      Tenant.find({ email: userEmail })
    ]);

    const bookingsWithAdminData = bookings.map(booking => {
      const bookingObj = booking.toObject();
      // Match tenant record by room ID
      const tenantData = tenants.find(t => 
        t.room && booking.room && t.room.toString() === booking.room._id.toString()
      );

      return {
        ...bookingObj,
        rentAmount: tenantData ? tenantData.rentAmount : 0,
        tenantStatus: tenantData ? tenantData.status : 'pending',
        joiningDate: tenantData ? tenantData.joinDate : booking.createdAt
      };
    });
    
    res.json(bookingsWithAdminData);
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