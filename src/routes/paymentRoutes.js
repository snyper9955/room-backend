const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPayments,
} = require("../controller/paymentController");

router.post("/order", createOrder);
router.post("/verify", verifyPayment);
router.get("/", getPayments);

module.exports = router;
