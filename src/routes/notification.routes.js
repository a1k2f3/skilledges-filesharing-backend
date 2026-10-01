const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const {
	listNotifications,
	markNotificationRead,
	markAllNotificationsRead,
	getPushPublicKey,
	savePushSubscription,
	deletePushSubscription
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(authenticate);
router.get("/push-public-key", getPushPublicKey);
router.post("/push-subscriptions", savePushSubscription);
router.delete("/push-subscriptions", deletePushSubscription);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

module.exports = router;
