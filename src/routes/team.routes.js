const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const requireTeamAdmin = require("../middleware/team.middleware");
const { listTeams, listMyTeams, getTeam, createTeam, updateTeam, deleteTeam, addMember, removeMember } = require("../controllers/team.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRole("admin"), listTeams);
router.get("/mine", requireRole("admin"), listMyTeams);
router.get("/:teamId", requireRole("admin"), getTeam);
router.post("/", requireRole("admin"), createTeam);
router.patch("/:teamId", requireTeamAdmin, updateTeam);
router.delete("/:teamId", requireTeamAdmin, deleteTeam);
router.post("/:teamId/members", requireTeamAdmin, addMember);
router.delete("/:teamId/members/:userId", requireTeamAdmin, removeMember);

module.exports = router;
