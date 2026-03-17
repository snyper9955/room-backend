const PhotoInteraction = require("../models/PhotoInteraction");

// Get interactions for a specific photo
exports.getInteraction = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    let interaction = await PhotoInteraction.findOne({ photoId })
      .populate("comments.user", "name")
      .populate("likes", "name");

    if (!interaction) {
      // Create a default interaction document if it doesn't exist
      interaction = await PhotoInteraction.create({ photoId, ratings: [], comments: [], likes: [] });
    }

    res.status(200).json(interaction);
  } catch (error) {
    next(error);
  }
};

// Add or update rating
exports.ratePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { userId, value } = req.body;

    let interaction = await PhotoInteraction.findOne({ photoId });
    if (!interaction) {
      interaction = new PhotoInteraction({ photoId, ratings: [], comments: [], likes: [] });
    }

    const existingRating = interaction.ratings.find(r => r.user.toString() === userId);
    if (existingRating) {
      existingRating.value = value;
    } else {
      interaction.ratings.push({ user: userId, value });
    }

    await interaction.save();
    res.status(200).json({ message: "Rating updated successfully", interaction });
  } catch (error) {
    next(error);
  }
};

// Add comment
exports.addComment = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { userId, userName, text } = req.body;

    let interaction = await PhotoInteraction.findOne({ photoId });
    if (!interaction) {
      interaction = new PhotoInteraction({ photoId, ratings: [], comments: [], likes: [] });
    }

    interaction.comments.push({ user: userId, userName, text });
    await interaction.save();

    res.status(201).json({ message: "Comment added successfully", interaction });
  } catch (error) {
    next(error);
  }
};

// Toggle Like
exports.toggleLike = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { userId } = req.body;

    let interaction = await PhotoInteraction.findOne({ photoId });
    if (!interaction) {
      interaction = new PhotoInteraction({ photoId, ratings: [], comments: [], likes: [] });
    }

    const likeIndex = interaction.likes.indexOf(userId);
    if (likeIndex > -1) {
      interaction.likes.splice(likeIndex, 1);
    } else {
      interaction.likes.push(userId);
    }

    await interaction.save();
    res.status(200).json({ message: "Like toggled successfully", interaction });
  } catch (error) {
    next(error);
  }
};
