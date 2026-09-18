const FileShare = require("../schema/FileShare");
const User = require("../schema/User");

const shareFile = async (req, res, next) => {
	try {
		const { userId, permission, expiresAt } = req.body;

		const recipient = await User.findById(userId);
		if (!recipient) {
			return res.status(404).json({ success: false, message: "Recipient user not found" });
		}

		if (recipient._id.toString() === req.user.id) {
			return res.status(400).json({ success: false, message: "You cannot share a file with yourself" });
		}

		const share = await FileShare.create({
			file: req.fileRecord._id,
			sharedBy: req.user.id,
			sharedWith: recipient._id,
			permission: permission === "edit" ? "edit" : "view",
			expiresAt: expiresAt || null
		});
		await share.populate([
			{ path: "file", select: "originalName secureUrl" },
			{ path: "sharedWith", select: "name email" }
		]);

		return res.status(201).json({ success: true, data: share });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: "File is already shared with this user" });
		}
		next(error);
	}
};

const listReceivedShares = async (req, res, next) => {
	try {
		const shares = await FileShare.find({
			sharedWith: req.user.id,
			$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
		})
			.populate("file", "originalName secureUrl size mimeType")
			.populate("sharedBy", "name email")
			.sort({ createdAt: -1 });

		return res.json({ success: true, count: shares.length, data: shares });
	} catch (error) {
		next(error);
	}
};

const revokeShare = async (req, res, next) => {
	try {
		const share = await FileShare.findById(req.params.shareId).populate("file", "owner");

		if (!share) {
			return res.status(404).json({ success: false, message: "Share not found" });
		}

		if (share.file.owner.toString() !== req.user.id && req.user.role !== "admin") {
			return res.status(403).json({ success: false, message: "Only the file owner or an admin can revoke this share" });
		}

		await share.deleteOne();
		return res.json({ success: true, message: "File share revoked" });
	} catch (error) {
		next(error);
	}
};

module.exports = { shareFile, listReceivedShares, revokeShare };
