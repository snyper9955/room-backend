const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  name: {
    type: String,
    trim: true,
  },

  phone: {
    type: String,
    trim: true,
  },

  gender: {
    type: String,
    enum: ["male", "female", "other"],
    lowercase: true,
    trim: true,
  },

  address: {
    type: String,
    trim: true,
  },

  dateOfBirth: Date,

  role: {
    type: String,
    enum: ["admin", "manager", "user"],
    default: "user",
    lowercase: true,
    trim: true,
  },

}, {timestamps:true})

module.exports = mongoose.model("User", userSchema);