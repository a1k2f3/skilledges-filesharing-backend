const FILE_ROOM_PREFIX = "file:";

const registerFileSocket = (io) => {
	io.on("connection", (socket) => {
		socket.on("file:join", (fileId, callback) => {
			if (typeof fileId !== "string" || !fileId.trim()) {
				return callback?.({ success: false, message: "A file id is required" });
			}

			socket.join(`${FILE_ROOM_PREFIX}${fileId}`);
			callback?.({ success: true });
		});

		socket.on("file:leave", (fileId, callback) => {
			if (typeof fileId !== "string" || !fileId.trim()) {
				return callback?.({ success: false, message: "A file id is required" });
			}

			socket.leave(`${FILE_ROOM_PREFIX}${fileId}`);
			callback?.({ success: true });
		});
	});
};

module.exports = { registerFileSocket, FILE_ROOM_PREFIX };
