const mongoose = require("mongoose");
const Team = require("../schema/Team");
const User = require("../schema/User");

const populateTeam = (query) => query.populate([
  { path: "owner", select: "name email role" },
  { path: "members", select: "name email role" }
]);

const getMemberIds = async (memberIds) => {
  if (memberIds === undefined) return [];
  if (!Array.isArray(memberIds) || memberIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) return null;

  const uniqueIds = [...new Set(memberIds.map((id) => id.toString()))];
  const users = await User.find({ _id: { $in: uniqueIds }, isActive: true }).select("_id");
  if (users.length !== uniqueIds.length) return null;
  return users.map((user) => user._id);
};

const listTeams = async (req, res, next) => {
  try {
    const teams = await populateTeam(Team.find({}).sort({ name: 1 }));
    return res.json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Team name is required"
      });
    }

    const memberIds = await getMemberIds(req.body.memberIds);
    if (memberIds === null) {
      return res.status(400).json({
        success: false,
        message: "memberIds must contain active, valid users"
      });
    }

    const members = [...new Map([
      [req.user.id, req.user.id],
      ...(memberIds || []).map((id) => [id.toString(), id])
    ]).values()];
    const team = await Team.create({
      name,
      owner: req.user.id,
      members
    });
    await populateTeam(Team.findById(team._id));

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

const updateTeam = async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Team name cannot be empty" });
      updates.name = name;
    }
    if (req.body.memberIds !== undefined) {
      const memberIds = await getMemberIds(req.body.memberIds);
      if (memberIds === null) return res.status(400).json({ success: false, message: "memberIds must contain active, valid users" });
      updates.members = [...new Map([
        [req.team.owner.toString(), req.team.owner],
        ...memberIds.map((id) => [id.toString(), id])
      ]).values()];
    }
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No supported fields were provided" });

    Object.assign(req.team, updates);
    await req.team.save();
    const team = await populateTeam(Team.findById(req.team._id));
    return res.json({ success: true, data: team });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "A team with this name already exists" });
    next(error);
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    await Team.findByIdAndDelete(req.team._id);
    return res.json({ success: true, data: { _id: req.team._id } });
  } catch (error) {
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
      { path: "owner", select: "name email role" },
      { path: "members", select: "name email role" }
    ]);

    return res.status(200).json({
      success: true,
      data: req.team
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: "A valid userId is required" });
    if (req.team.owner.toString() === userId) return res.status(400).json({ success: false, message: "The team owner cannot be removed" });
    req.team.members = req.team.members.filter((memberId) => memberId.toString() !== userId);
    await req.team.save();
    const team = await populateTeam(Team.findById(req.team._id));
    return res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember
};
