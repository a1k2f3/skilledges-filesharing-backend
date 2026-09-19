const User = require("../schema/User");
const { getIO } = require("../config/socket");
const { USER_STATUS_UPDATED, USER_PRESENCE_UPDATED } = require("../constants/events");

const registerUserSocket = (io) => {
	io.on("connection", (socket) => {
		socket.on("user:presence", async (callback) => {
			try {
				const user = await User.findById(socket.user.id).select("name email role lastSeen isActive");
				if (!user) {
					return callback?.({ success: false, message: "User not found" });
				}

				const payload = {
					userId: user._id.toString(),
					name: user.name,
					email: user.email,
					role: user.role,
					isActive: user.isActive,
					lastSeen: user.lastSeen,
					online: true
				};

				callback?.({ success: true, data: payload });
			} catch (error) {
				callback?.({ success: false, message: "Unable to fetch user presence" });
			}
		});

		socket.on("user:status", async (status, callback) => {
			const normalizedStatus = typeof status === "string" ? status.trim() : "";
			if (!normalizedStatus) {
				return callback?.({ success: false, message: "A status is required" });
			}

			try {
				const user = await User.findByIdAndUpdate(
					socket.user.id,
					{ lastSeen: new Date() },
					{ new: true }
				).select("name email role lastSeen");

				if (!user) {
					return callback?.({ success: false, message: "User not found" });
				}

				const payload = {
					userId: user._id.toString(),
					name: user.name,
					status: normalizedStatus,
					lastSeen: user.lastSeen
				};

				getIO().to(`user:${socket.user.id}`).emit(USER_STATUS_UPDATED, payload);
				callback?.({ success: true, data: payload });
			} catch (error) {
				callback?.({ success: false, message: "Unable to update user status" });
			}
		});

		socket.on("disconnect", async () => {
			if (!socket.user?.id) return;

			try {
				const user = await User.findByIdAndUpdate(
					socket.user.id,
					{ lastSeen: new Date() },
					{ new: true }
				).select("_id lastSeen");

				if (!user) return;

				const payload = {
					userId: user._id.toString(),
					online: false,
					lastSeen: user.lastSeen
				};

				getIO().to(`user:${socket.user.id}`).emit(USER_PRESENCE_UPDATED, payload);
				getIO().to("admin").emit(USER_PRESENCE_UPDATED, payload);
			} catch (error) {
				console.error("Socket user disconnect handling failed:", error);
			}
		});
	});
};

module.exports = { registerUserSocket };