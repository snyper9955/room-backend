const express = require("express");
const cors = require("cors");

const app = express();
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const interactionRoutes = require("./routes/interactionRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const roomRoutes = require("./routes/roomRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/interactions", interactionRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("API Running...");
});

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Routes are already registered above

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
