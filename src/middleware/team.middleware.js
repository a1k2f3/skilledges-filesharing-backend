const Team = require("../schema/Team");

const requireTeamAdmin = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    const isOwner = team.owner.toString() === req.user.id;

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or an admin can manage this team"
      });
    }

    req.team = team;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireTeamAdmin;
