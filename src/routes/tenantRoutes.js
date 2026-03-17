const express = require("express");
const router = express.Router();
const {
  addTenant,
  getTenants,
  updateTenant,
} = require("../controller/tenantController");

router.post("/", addTenant);
router.get("/", getTenants);
router.patch("/:id", updateTenant);

module.exports = router;
