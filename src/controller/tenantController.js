const Tenant = require("../models/Tenant");
const Room = require("../models/Room");

// @desc Add tenant
exports.addTenant = async (req, res, next) => {
  try {
    const { name, phone, email, roomId, rentAmount } = req.body;

    const tenant = await Tenant.create({
      name: name?.trim(),
      phone: phone?.trim(),
      email: email?.toLowerCase()?.trim(),
      room: roomId,
      rentAmount,
    });

    // Update room status
    await Room.findByIdAndUpdate(roomId, { status: "occupied" });

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
};

// @desc Get tenants
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().populate("room");
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

// @desc Update tenant
exports.updateTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    if (req.body.email) req.body.email = req.body.email.toLowerCase().trim();
    if (req.body.name) req.body.name = req.body.name.trim();

    Object.assign(tenant, req.body);
    await tenant.save();

    res.json(tenant);
  } catch (error) {
    next(error);
  }
};