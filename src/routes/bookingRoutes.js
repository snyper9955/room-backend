const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  getMyBookings,
  updateBooking,
} = require("../controller/bookingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/my", protect, getMyBookings);
router.patch("/:id", updateBooking);

module.exports = router;
