const User = require("../models/User");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

// @desc    Get top-level dashboard statistics for Admin
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalRooms = await Room.countDocuments();
    const occupiedRooms = await Room.countDocuments({ status: "occupied" });
    const availableRooms = await Room.countDocuments({ status: "available" });
    const totalTenants = await Tenant.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // Sum all successful payment amounts
    const revenueResult = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Monthly theoretical income (sum of all room prices that are occupied)
    const occupiedRoomDetails = await Room.find({ status: "occupied" });
    const monthlyTheoreticalIncome = occupiedRoomDetails.reduce((sum, room) => sum + room.price, 0);

    res.status(200).json({
      totalRooms,
      occupiedRooms,
      availableRooms,
      totalTenants,
      totalBookings,
      totalRevenue,
      monthlyIncome: monthlyTheoreticalIncome,
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get master list of all tenants with data
// @route   GET /api/admin/tenants
// @access  Private (Admin Only)
exports.getAllTenantsData = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().populate("room");
    res.status(200).json(tenants);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin/Staff/Manager)
// @route   GET /api/admin/users
exports.getAllAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ["admin", "manager"] } }, "name email role phone");
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};
