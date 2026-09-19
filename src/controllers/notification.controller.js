const Notification = require("../schema/Notification");
const { getIO } = require("../config/socket");
const { NOTIFICATION_NEW, NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } = require("../constants/events");

const createNotification = async ({ recipient, type, title, message, data = {} }) => {
	const notification = await Notification.create({ recipient, type, title, message, data });
	getIO().to(`user:${recipient.toString()}`).emit(NOTIFICATION_NEW, notification);
	return notification;
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

module.exports = { createNotification, listNotifications, markNotificationRead, markAllNotificationsRead };
