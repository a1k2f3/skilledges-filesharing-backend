const mongoose = require("mongoose");
const User = require("../schema/User");

const loadUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required"
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requireUserAccess = (req, res, next) => {
  const authenticatedUserId = req.user.id || req.user._id;
  const isOwner = authenticatedUserId === req.targetUser._id.toString();

  if (req.user.role !== "admin" && !isOwner) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this user"
    });
  }

  next();
};

module.exports = {
  loadUser,
  requireUserAccess
};
