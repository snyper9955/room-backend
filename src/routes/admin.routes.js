const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { getDashboardStats, renewStay, vacateRoom, getRenterDetails, updateRenterDetails, grantAccess, getAllUsers } = require("../controller/admin.controller");

// Protected Admin Routes
router.get("/stats", protect, admin, getDashboardStats);
router.get("/users", protect, admin, getAllUsers);
router.post("/renew/:bookingId", protect, admin, renewStay);
router.post("/vacate/:bookingId", protect, admin, vacateRoom);
router.get("/renter/:bookingId", protect, admin, getRenterDetails);
router.put("/renter/:bookingId", protect, admin, updateRenterDetails);
router.post("/grant-access", protect, admin, grantAccess);

module.exports = router;
