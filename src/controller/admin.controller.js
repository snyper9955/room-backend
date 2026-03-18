const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Payment = require("../models/Payment");

/**
 * @desc Get dashboard statistics for admin
 * @route GET /api/admin/stats
 * @access Private/Admin
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Room Stats
    const totalRooms = await Room.countDocuments();
    const occupiedRooms = await Room.countDocuments({ status: "occupied" });
    const availableRooms = await Room.countDocuments({ status: "available" });
    const maintenanceRooms = await Room.countDocuments({ status: "maintenance" });

    // 2. Revenue Stats (from completed payments)
    const revenueData = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // 3. Occupied Room Details (for "Who occupied which room")
    // We'll look for active bookings
    const activeBookings = await Booking.find({ 
      status: "approved",
      expiryDate: { $gte: new Date() }
    }).populate("room");

    // 4. Expiring Stays (within next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringStays = await Booking.find({
      status: "approved",
      expiryDate: { $gte: new Date(), $lte: sevenDaysFromNow }
    }).populate("room");

    // 5. Recent Payments
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("tenant");

    res.json({
      rooms: {
        total: totalRooms,
        occupied: occupiedRooms,
        available: availableRooms,
        maintenance: maintenanceRooms
      },
      revenue: totalRevenue,
      occupancy: activeBookings.map(b => ({
        tenantId: b._id, // Use booking ID as the reference for now
        tenantName: b.name,
        roomNumber: b.room?.roomNumber,
        expiryDate: b.expiryDate,
        email: b.email,
        phone: b.phone,
        paymentStatus: b.paymentStatus || "completed" // Default to completed for old records
      })),
      expiringSoon: expiringStays.map(b => ({
        tenantName: b.name,
        roomNumber: b.room?.roomNumber,
        expiryDate: b.expiryDate,
        phone: b.phone
      })),
      recentPayments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Renew tenant stay
 * @route POST /api/admin/renew/:bookingId
 */
exports.renewStay = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Extend by 30 days
    const newExpiry = new Date(booking.expiryDate || new Date());
    newExpiry.setDate(newExpiry.getDate() + 30);

    booking.expiryDate = newExpiry;
    await booking.save();

    // Sync with Room
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room, { occupiedUntil: newExpiry });
    }

    res.json({ success: true, message: "Stay renewed for 30 days", newExpiry });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Vacate room
 * @route POST /api/admin/vacate/:bookingId
 */
exports.vacateRoom = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const roomId = booking.room;
    
    // 1. Mark booking as vacated and expired
    booking.status = "vacated";
    booking.expiryDate = new Date();
    await booking.save();

    // 2. Update Room Status
    if (roomId) {
      await Room.findByIdAndUpdate(roomId, { 
        status: "available",
        occupiedUntil: null 
      });
    }

    // 3. Mark Tenant as inactive
    const Tenant = require("../models/Tenant");
    await Tenant.findOneAndUpdate(
      { email: booking.email },
      { status: "inactive" }
    );

    res.json({ success: true, message: "Room vacated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get consolidated renter details for admin
 * @route GET /api/admin/renter/:bookingId
 */
exports.getRenterDetails = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("room");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const User = require("../models/User");
    const user = await User.findOne({ email: booking.email });

    res.json({
      success: true,
      booking,
      user: user || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update renter details across all models
 * @route PUT /api/admin/renter/:bookingId
 */
exports.updateRenterDetails = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;
    const Tenant = require("../models/Tenant");
    const User = require("../models/User");

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const oldEmail = booking.email;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (email) updateData.email = email.toLowerCase().trim();

    // 1. Update Booking
    Object.assign(booking, updateData);
    await booking.save();

    // 2. Synchronize with User, Tenant, and ALL Bookings for this user
    if (Object.keys(updateData).length > 0) {
      const userUpdateData = { ...updateData };
      if (address) userUpdateData.address = address.trim();

      await Promise.all([
        User.updateMany({ email: oldEmail }, userUpdateData),
        Tenant.updateMany({ email: oldEmail }, updateData),
        Booking.updateMany({ email: oldEmail }, updateData)
      ]);
    }

    res.json({ success: true, message: "Renter details updated successfully", booking });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Admin grants room access (payment pending)
 * @route POST /api/admin/grant-access
 */
exports.grantAccess = async (req, res, next) => {
  try {
    const { name, email, phone, roomId, amount } = req.body;
    const userEmail = email?.toLowerCase()?.trim();

    // 1. Check if room exists and is available
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.status === "occupied") return res.status(400).json({ message: "Room already occupied" });

    // 2. Set expiry (30 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // 3. Create/Update Booking (paymentStatus: pending)
    let booking = await Booking.findOne({ 
      email: userEmail, 
      room: roomId, 
      status: { $ne: "vacated" } 
    });

    if (booking) {
      console.log(`[ADMIN] Updating existing booking ${booking._id} for ${userEmail}`);
      booking.name = name?.trim() || booking.name;
      booking.phone = phone?.trim() || booking.phone;
      booking.status = "approved";
      booking.moveInDate = new Date();
      booking.expiryDate = expiryDate;
      booking.paymentStatus = "pending";
      await booking.save();
    } else {
      console.log(`[ADMIN] Creating new booking for ${userEmail}`);
      booking = await Booking.create({
        name: name?.trim(),
        phone: phone?.trim(),
        email: userEmail,
        room: roomId,
        status: "approved",
        moveInDate: new Date(),
        expiryDate: expiryDate,
        paymentStatus: "pending"
      });
    }

    // 4. Create/Update Tenant record
    const Tenant = require("../models/Tenant");
    let tenant = await Tenant.findOne({ email: userEmail });
    if (!tenant) {
      tenant = await Tenant.create({
        name: name?.trim(),
        email: userEmail,
        phone: phone?.trim(),
        room: roomId,
        rentAmount: amount,
        status: "active",
        moveInDate: new Date(),
        paymentStatus: "pending"
      });
    } else {
      tenant.room = roomId;
      tenant.status = "active";
      tenant.moveInDate = new Date();
      tenant.paymentStatus = "pending";
      await tenant.save();
    }

    // 5. Update Room status
    room.status = "occupied";
    room.occupiedUntil = expiryDate;
    await room.save();

    res.json({
      success: true,
      message: "Access granted successfully. Payment remains pending.",
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all registered users
 * @route GET /api/admin/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const users = await User.find({ role: "user" }).select("-password");
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};
