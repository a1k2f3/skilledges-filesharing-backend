const Notification = require("../schema/Notification");
const PushSubscription = require("../schema/PushSubscription");
const { getIO } = require("../config/socket");
const { NOTIFICATION_NEW, NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } = require("../constants/events");
const { sendPushNotification } = require("../utils/push-notifications");

const createNotification = async ({ recipient, type, title, message, data = {} }) => {
	const notification = await Notification.create({ recipient, type, title, message, data });
	getIO().to(`user:${recipient.toString()}`).emit(NOTIFICATION_NEW, notification);
	try {
		await sendPushNotification({ recipient, title, message, url: type === "file-shared" ? "/files" : "/dashboard" });
	} catch (error) {
		console.warn("Web push notification failed:", error.message);
	}
	return notification;
};

const getPushPublicKey = (req, res) => {
	if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) {
		return res.status(503).json({ success: false, message: "Device notifications are not configured" });
	}
	return res.json({ success: true, data: { publicKey: process.env.WEB_PUSH_PUBLIC_KEY } });
};

const savePushSubscription = async (req, res, next) => {
	try {
		const { endpoint, keys, expirationTime } = req.body;
		if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !keys?.p256dh || !keys?.auth) {
			return res.status(400).json({ success: false, message: "A valid device push subscription is required" });
		}
		const subscription = await PushSubscription.findOneAndUpdate(
			{ endpoint },
			{ $set: { user: req.user.id, keys, expirationTime: expirationTime || null } },
			{ upsert: true, new: true, runValidators: true }
		);
		return res.status(200).json({ success: true, data: { id: subscription._id } });
	} catch (error) {
		next(error);
	}
};

const deletePushSubscription = async (req, res, next) => {
	try {
		const { endpoint } = req.body;
		if (typeof endpoint !== "string") return res.status(400).json({ success: false, message: "A device endpoint is required" });
		await PushSubscription.deleteOne({ user: req.user.id, endpoint });
		return res.json({ success: true, message: "Device notifications disabled" });
	} catch (error) {
		next(error);
	}
};

const listNotifications = async (req, res, next) => {
	try {
		const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
		const filter = { recipient: req.user.id };
		if (req.query.unreadOnly === "true") filter.readAt = null;

		const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
		return res.json({
			success: true,
			count: notifications.length,
			unreadCount: await Notification.countDocuments({ recipient: req.user.id, readAt: null }),
			data: notifications
		});
	} catch (error) {
		next(error);
	}
};

const markNotificationRead = async (req, res, next) => {
	try {
		const notification = await Notification.findOneAndUpdate(
			{ _id: req.params.notificationId, recipient: req.user.id },
			{ $set: { readAt: new Date() } },
			{ new: true }
		);
		if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

		getIO().to(`user:${req.user.id}`).emit(NOTIFICATION_READ, { notificationId: notification._id.toString(), readAt: notification.readAt });
		return res.json({ success: true, data: notification });
	} catch (error) {
		next(error);
	}
};

const markAllNotificationsRead = async (req, res, next) => {
	try {
		const readAt = new Date();
		const result = await Notification.updateMany({ recipient: req.user.id, readAt: null }, { $set: { readAt } });
		getIO().to(`user:${req.user.id}`).emit(NOTIFICATIONS_READ_ALL, { readAt });
		return res.json({ success: true, modifiedCount: result.modifiedCount });
	} catch (error) {
		next(error);
	}
};

module.exports = { createNotification, listNotifications, markNotificationRead, markAllNotificationsRead, getPushPublicKey, savePushSubscription, deletePushSubscription };
