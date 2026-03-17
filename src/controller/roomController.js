const Room = require("../models/Room");
const path = require("path");

// @desc Get all rooms
exports.getRooms = async (req, res, next) => {
  try {
    // Auto-expire occupied rooms
    const now = new Date();
    await Room.updateMany(
      { status: "occupied", occupiedUntil: { $lt: now } },
      { $set: { status: "available" }, $unset: { occupiedUntil: "" } }
    );

    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// @desc Get single room
exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    next(error);
  }
};

// @desc Add room
exports.addRoom = async (req, res, next) => {
  try {
    console.log("Adding Room. Body:", req.body);
    
    const { roomNumber, price, type, amenities, description, status } = req.body;

    // Validate required fields manually for better logging
    if (!roomNumber) {
      return res.status(400).json({ message: "Room number is required." });
    }
    if (!price) {
      return res.status(400).json({ message: "Price is required." });
    }
    if (!type) {
      return res.status(400).json({ message: "Room type is required." });
    }

    // Check if room number already exists
    const trimmedRoomNumber = roomNumber.toString().trim();
    const existingRoom = await Room.findOne({ roomNumber: trimmedRoomNumber });
    if (existingRoom) {
      return res.status(400).json({ message: `Room number ${trimmedRoomNumber} already exists.` });
    }

    const images = req.files 
      ? req.files.map((file) => {
          if (file.path && (file.path.startsWith("http") || file.path.startsWith("https"))) {
            return file.path;
          }
          if (file.secure_url) return file.secure_url;
          // Local storage fallback: convert local path to URL
          const filename = file.filename || path.basename(file.path);
          return `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${filename}`;
        }).filter(path => !!path) 
      : [];

    // Normalize status to lowercase
    const normalizedStatus = status ? status.toLowerCase() : "available";

    // Correctly handle amenities from FormData (could be string or array)
    const amenitiesArray = amenities 
      ? (Array.isArray(amenities) ? amenities : [amenities])
      : [];

    console.log("Creating room with data:", {
      roomNumber: trimmedRoomNumber,
      price: Number(price),
      type: type || "Single",
      amenities: amenitiesArray,
      description,
      images,
      status: normalizedStatus,
    });

    const room = await Room.create({
      roomNumber: trimmedRoomNumber,
      price: Number(price),
      type: type || "Single",
      amenities: amenitiesArray,
      description,
      images,
      status: normalizedStatus,
    });

    console.log("Room created successfully:", room._id);
    res.status(201).json(room);
  } catch (error) {
    console.error("ADD ROOM ERROR DETAILS:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      errors: error.errors // Mongoose validation errors
    });
    next(error);
  }
};

// @desc Update room
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }

    const { amenities, _id, roomNumber, ...rest } = req.body;

    // Handle roomNumber update with uniqueness check
    if (roomNumber && roomNumber.toString().trim() !== room.roomNumber) {
      const trimmedRoomNumber = roomNumber.toString().trim();
      const existingRoom = await Room.findOne({ roomNumber: trimmedRoomNumber });
      if (existingRoom) {
        return res.status(400).json({ message: `Room number ${trimmedRoomNumber} already exists.` });
      }
      room.roomNumber = trimmedRoomNumber;
    }

    // Handle amenities from FormData
    if (amenities) {
      room.amenities = Array.isArray(amenities) ? amenities : [amenities];
    }

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files
        .map((file) => {
          if (file.path && (file.path.startsWith("http") || file.path.startsWith("https"))) {
            return file.path;
          }
          if (file.secure_url) return file.secure_url;
          const filename = file.filename || path.basename(file.path);
          return `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${filename}`;
        })
        .filter(path => !!path);
      
      if (newImages.length > 0) {
        // We append new images to existing ones
        room.images = [...room.images, ...newImages];
      }
    }

    // Normalize status if provided
    if (rest.status) {
      rest.status = rest.status.toLowerCase();
    }

    // Update other fields
    Object.assign(room, rest);
    
    await room.save();
    res.json(room);
  } catch (error) {
    next(error);
  }
};

// @desc Delete room
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }

    await room.deleteOne();
    res.json({ message: "Room removed" });
  } catch (error) {
    next(error);
  }
};