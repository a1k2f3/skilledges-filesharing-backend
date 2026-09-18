const mongoose = require("mongoose");
const Team = require("../schema/Team");
const User = require("../schema/User");

const createTeam = async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Team name is required"
      });
    }

    const team = await Team.create({
      name,
      owner: req.user.id,
      members: [req.user.id]
    });

    return res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A team with this name already exists"
      });
    }

    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid userId is required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (req.team.members.some((memberId) => memberId.toString() === userId)) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this team"
      });
    }

    req.team.members.push(user._id);
    await req.team.save();
    await req.team.populate([
      { path: "owner", select: "name email" },
      { path: "members", select: "name email" }
    ]);

    return res.status(200).json({
      success: true,
      data: req.team
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeam,
  addMember
};
