const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const requireTeamAdmin = require("../middleware/team.middleware");
const { createTeam, addMember } = require("../controllers/team.controller");

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole("admin"), createTeam);
router.post("/:teamId/members", requireTeamAdmin, addMember);

module.exports = router;
