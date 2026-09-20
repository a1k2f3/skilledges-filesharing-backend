const User = require("../schema/User");

const toUserPayload = (user) => ({
	userId: user._id.toString(),
	name: user.name,
	email: user.email,
	role: user.role,
	isActive: user.isActive,
	lastSeen: user.lastSeen
});

const registerAuthSocket = (io) => {
	io.on("connection", (socket) => {
		socket.emit("auth:authenticated", {
			success: true,
			data: {
				userId: socket.user.id,
				role: socket.user.role
			}
		});
		socket.on("auth:me", async (callback) => {
			try {
				const user = await User.findById(socket.user.id).select("name email role isActive lastSeen");
				if (!user) {
					return callback?.({ success: false, message: "User not found" });
				}

				if (!user.isActive) {
					return callback?.({ success: false, message: "This account is inactive" });
				}

				callback?.({ success: true, data: toUserPayload(user) });
			} catch (error) {
				callback?.({ success: false, message: "Unable to fetch authenticated user" });
			}
		});

		socket.on("auth:logout", (callback) => {
			callback?.({ success: true });
			socket.disconnect(true);
		});
	});
};

module.exports = { registerAuthSocket };
