const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { loadUser, requireUserAccess } = require("../middleware/user.middleware");
const { signup } = require("../controllers/auth.controller");
const {
	createUser,
	getCurrentUser,
	listUsers,
	getUser,
	updateUser
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/signup", signup);
router.use(authenticate);

router.get("/me", getCurrentUser);
router.post("/", requireRole("admin"), createUser);
router.get("/", requireRole("admin"), listUsers);
router.get("/:userId", loadUser, requireUserAccess, getUser);
router.patch("/:userId", loadUser, requireUserAccess, updateUser);

module.exports = router;
