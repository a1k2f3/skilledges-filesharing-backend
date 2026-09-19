const Notification = require("../schema/Notification");
const { getIO } = require("../config/socket");
const { NOTIFICATION_READ, NOTIFICATIONS_READ_ALL } = require("../constants/events");

const registerNotificationSocket = (io) => {
	io.on("connection", (socket) => {
		socket.on("notification:read", async (notificationId, callback) => {
			try {
				const notification = await Notification.findOneAndUpdate(
					{ _id: notificationId, recipient: socket.user.id },
					{ $set: { readAt: new Date() } },
					{ new: true }
				);
				if (!notification) return callback?.({ success: false, message: "Notification not found" });

				const payload = { notificationId: notification._id.toString(), readAt: notification.readAt };
				getIO().to(`user:${socket.user.id}`).emit(NOTIFICATION_READ, payload);
				callback?.({ success: true, data: notification });
			} catch (error) {
				callback?.({ success: false, message: "Unable to mark notification as read" });
			}
		});

		socket.on("notification:read-all", async (callback) => {
			try {
				const readAt = new Date();
				const result = await Notification.updateMany({ recipient: socket.user.id, readAt: null }, { $set: { readAt } });
				const payload = { readAt };
				getIO().to(`user:${socket.user.id}`).emit(NOTIFICATIONS_READ_ALL, payload);
				callback?.({ success: true, modifiedCount: result.modifiedCount });
			} catch (error) {
				callback?.({ success: false, message: "Unable to mark notifications as read" });
			}
		});
	});
};

module.exports = { registerNotificationSocket };
