const express = require("express");
const router = express.Router();
const interactionController = require("../controller/interactionController");

// Get interactions for a photo
router.get("/:photoId", interactionController.getInteraction);

// Add/Update rating
router.post("/:photoId/rate", interactionController.ratePhoto);

// Add comment
router.post("/:photoId/comment", interactionController.addComment);

// Toggle like
router.post("/:photoId/toggle-like", interactionController.toggleLike);

module.exports = router;
