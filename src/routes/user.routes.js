const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { loadUser, requireUserAccess } = require("../middleware/user.middleware");
const { signup } = require("../controllers/auth.controller");
const {
	createUser,
	getCurrentUser,
	listUsers,
	listDesigners,
	getUser,
	updateUser,
	deleteDesigner,
	setDesignerStatus
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/signup", signup);
router.use(authenticate);

router.get("/me", getCurrentUser);
router.get("/designers", requireRole("admin"), listDesigners);
router.patch("/designers/:designerId/status", requireRole("admin"), setDesignerStatus);
router.post("/", requireRole("admin"), createUser);
router.get("/", requireRole("admin"), listUsers);
router.delete("/designers/:designerId", requireRole("admin"), deleteDesigner);
router.get("/:userId", loadUser, requireUserAccess, getUser);
router.patch("/:userId", loadUser, requireUserAccess, updateUser);

module.exports = router;
