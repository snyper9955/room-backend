const express = require("express");
const router = express.Router();
const {
  getRooms,
  getRoomById,
  addRoom,
  updateRoom,
  deleteRoom,
} = require("../controller/roomController");

const { protect, admin } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

router.get("/", getRooms);
router.get("/:id", getRoomById);
router.post("/", protect, admin, upload.array("images", 5), addRoom);
router.patch("/:id", protect, admin, upload.array("images", 5), updateRoom);
router.delete("/:id", protect, admin, deleteRoom);

module.exports = router;
