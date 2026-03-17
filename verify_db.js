const mongoose = require("mongoose");
const Booking = require("./src/models/Booking");
const User = require("./src/models/User");
const Room = require("./src/models/Room");
require("dotenv").config();

const verify = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log("Connecting to DB...");
    await mongoose.connect(uri);
    console.log("Connected.");

    const users = await User.find();
    console.log("\n--- Users ---");
    users.forEach(u => console.log(`Email: "${u.email}", Role: ${u.role}, ID: ${u._id}`));

    const rooms = await Room.find();
    console.log("\n--- Rooms ---");
    rooms.forEach(r => console.log(`Room: ${r.roomNumber}, Status: ${r.status}, ID: ${r._id}`));

    const bookings = await Booking.find().populate("room");
    console.log("\n--- Bookings ---");
    bookings.forEach(b => {
      console.log(`Email: "${b.email}", Status: ${b.status}, RoomID in Booking: ${b.room?._id}, Room# in Booking: ${b.room?.roomNumber}, ID: ${b._id}, CreatedAt: ${b.createdAt}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};

verify();
