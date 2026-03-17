const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
});

const photoInteractionSchema = new mongoose.Schema({
  photoId: {
    type: String, // String ID as used in galleryData.js
    required: true,
    unique: true,
    trim: true
  },
  ratings: [ratingSchema],
  comments: [commentSchema],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
}, { timestamps: true });

// Virtual to calculate average rating
photoInteractionSchema.virtual('averageRating').get(function() {
  if (this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
  return (sum / this.ratings.length).toFixed(1);
});

module.exports = mongoose.model("PhotoInteraction", photoInteractionSchema);
