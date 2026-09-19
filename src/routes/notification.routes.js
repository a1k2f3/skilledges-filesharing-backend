const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	listNotifications,
	markNotificationRead,
	markAllNotificationsRead
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

module.exports = router;
