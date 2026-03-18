const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, address, dateOfBirth, role } = req.body;

    // Check if user exists (ensure email is compared in lowercase)
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name?.trim(),
      email: email?.toLowerCase()?.trim(),
      password: hashedPassword,
      phone: phone?.trim(),
      gender: gender?.toLowerCase()?.trim(),
      address: address?.trim(),
      dateOfBirth,
      role: role || "user",
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email: email?.toLowerCase()?.trim() }).select("+password");

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (client should delete token)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Generate OTP and send it via email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase()?.trim();

    // Verify user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "There is no user with that email address." });
    }

    // Generate a random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing OTPs for this email to avoid confusion
    await Otp.deleteMany({ email: normalizedEmail });

    // Save newly generated OTP via the model
    await Otp.create({
      email: normalizedEmail,
      otp: otpCode,
    });

    // Send email with OTP
    const message = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nYour OTP code is: ${otpCode}\n\nThis code will expire in 5 minutes.`;

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendEmail({
          email: user.email,
          subject: "Password Reset OTP",
          message,
        });
      } else {
         console.log(`[DEVELOPMENT MODE] Email not configured in .env. The OTP for ${normalizedEmail} is: ${otpCode}`);
      }
      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Forgot password email error:", error);
      await Otp.deleteMany({ email: normalizedEmail });
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and reset password
// @route   PUT /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email?.toLowerCase()?.trim();

    // Find the OTP document
    const otpRecord = await Otp.findOne({ email: normalizedEmail, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password and save it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Delete the OTP as it has been used
    await Otp.deleteMany({ email: normalizedEmail });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.gender = req.body.gender || user.gender;
      user.address = req.body.address || user.address;
      user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      // Sync name and phone updates with Bookings and Tenant records
      try {
        const Booking = require("../models/Booking");
        const Tenant = require("../models/Tenant");
        const syncData = {};
        if (req.body.name) syncData.name = req.body.name.trim();
        if (req.body.phone) syncData.phone = req.body.phone.trim();

        if (Object.keys(syncData).length > 0) {
          await Promise.all([
            Booking.updateMany({ email: updatedUser.email }, syncData),
            Tenant.updateMany({ email: updatedUser.email }, syncData)
          ]);
        }
      } catch (syncError) {
        console.error("Profile sync error:", syncError);
      }

      // Return updated info + token
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        address: updatedUser.address,
        dateOfBirth: updatedUser.dateOfBirth,
        role: updatedUser.role,
        token: jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET || "default_secret", {
          expiresIn: "30d",
        }),
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};
