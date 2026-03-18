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

// Serve static files from the React app
const clientPath = path.join(__dirname, "../../client/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientPath));

  // Any request that doesn't match the API routes above, send back the React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
} else {
  // Test Route for dev
  app.get("/", (req, res) => {
    res.send("API Running...");
  });
}

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Error Handling (only for routes that didn't match anything else, including the SPA fallback in production if needed, but "*" usually catches all)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
