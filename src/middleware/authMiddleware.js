const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];

      // Use JWT_SECRET from .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");

      req.user = await User.findById(decoded.id).select("-password");

      next();
    } else {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
  } catch (error) {
    console.error(`[AUTH ERROR] ${error.message}${error.name === 'TokenExpiredError' ? ' (Expired)' : ''}`);
    return res.status(401).json({ message: "Token failed", error: error.message });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.email === "chemistryhero1@gmail.com") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };