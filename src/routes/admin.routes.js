const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllTenantsData,
  getAllAdminUsers
} = require("../controller/admin.controller");

// NOTE: In a production app, you should add an admin auth middleware here 
// to verify req.user.role === 'admin' before granting access.

router.get("/stats", getDashboardStats);
router.get("/tenants", getAllTenantsData);
router.get("/users", getAllAdminUsers);

module.exports = router;
