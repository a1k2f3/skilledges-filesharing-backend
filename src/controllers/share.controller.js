const FileShare = require("../schema/FileShare");
const User = require("../schema/User");
const Team = require("../schema/Team");
const { getIO } = require("../config/socket");
const { FILE_SHARED, FILE_SHARE_REVOKED } = require("../constants/events");
const { createNotification } = require("./notification.controller");

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

		let share = await FileShare.findOne({ file: req.fileRecord._id, sharedWith: recipient._id });
		if (share) return res.json({ success: true, data: share });

		const sender = await User.findById(req.user.id).select("name");
		share = await FileShare.create({
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
		getIO().to(`user:${recipient._id}`).emit(FILE_SHARED, { share });
		getIO().to(`user:${req.user.id}`).emit(FILE_SHARED, { share });
		await createNotification({
			recipient: recipient._id,
			type: "file-shared",
			title: "File shared with you",
			message: `${share.file.originalName} was shared with you`,
			data: { shareId: share._id, fileId: share.file._id }
		});

		return res.status(201).json({ success: true, data: share });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: "File is already shared with this user" });
		}
		next(error);
	}
};

const shareFileWithAdmins = async (req, res, next) => {
	try {
		const admins = await User.find({ role: "admin", isActive: true }).select("name email whatsappNumber");
		if (!admins.length) return res.status(404).json({ success: false, message: "No active admin account is available" });
		const sender = await User.findById(req.user.id).select("name");

		const existingShares = await FileShare.find({
			file: req.fileRecord._id,
			sharedWith: { $in: admins.map((admin) => admin._id) }
		}).select("sharedWith");
		const existingIds = new Set(existingShares.map((share) => share.sharedWith.toString()));
		const recipients = admins.filter((admin) => !existingIds.has(admin._id.toString()));
		if (!recipients.length) {
			return res.json({ success: true, data: { sharedCount: 0, skippedCount: admins.length } });
		}

		const shares = await FileShare.insertMany(recipients.map((admin) => ({
			file: req.fileRecord._id,
			sharedBy: req.user.id,
			sharedWith: admin._id,
			permission: "view"
		})));
		recipients.forEach((admin, index) => {
			getIO().to(`user:${admin._id}`).emit(FILE_SHARED, { share: shares[index] });
		});
		await Promise.all(recipients.map((admin, index) => createNotification({
			recipient: admin._id,
			type: "file-shared",
			title: "Designer file received",
			message: `${req.fileRecord.originalName} was sent by ${sender?.name || "a user"}`,
			data: { fileId: req.fileRecord._id, shareId: shares[index]._id }
		})));
		return res.status(201).json({ success: true, data: { sharedCount: shares.length, skippedCount: existingIds.size } });
	} catch (error) {
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

const listSentShares = async (req, res, next) => {
	try {
		const shares = await FileShare.find({ sharedBy: req.user.id })
			.populate("file", "originalName secureUrl size mimeType format")
			.populate("sharedWith", "name email role")
			.sort({ createdAt: -1 });

		return res.json({ success: true, count: shares.length, data: shares });
	} catch (error) {
		next(error);
	}
};

const shareFileWithTeam = async (req, res, next) => {
	try {
		const team = await Team.findById(req.params.teamId).populate("members", "name email isActive whatsappNumber");
		if (!team) return res.status(404).json({ success: false, message: "Team not found" });

		const sender = await User.findById(req.user.id).select("name");
		const members = team.members.filter((member) => member.isActive && member._id.toString() !== req.user.id);
		if (!members.length) {
			return res.status(400).json({ success: false, message: "Add at least one active member to this team before sending a file" });
		}
		const existingShares = await FileShare.find({ file: req.fileRecord._id, sharedWith: { $in: members.map((member) => member._id) } }).select("sharedWith");
		const existingIds = new Set(existingShares.map((share) => share.sharedWith.toString()));
		const recipients = members.filter((member) => !existingIds.has(member._id.toString()));

		const shares = await FileShare.insertMany(recipients.map((member) => ({
			file: req.fileRecord._id,
			sharedBy: req.user.id,
			sharedWith: member._id,
			permission: req.body.permission === "edit" ? "edit" : "view",
			expiresAt: req.body.expiresAt || null
		})));
		recipients.forEach((member, index) => {
			getIO().to(`user:${member._id}`).emit(FILE_SHARED, { share: shares[index], teamId: team._id });
		});
		getIO().to(`user:${req.user.id}`).emit(FILE_SHARED, { teamId: team._id, fileId: req.fileRecord._id, sharedCount: shares.length });
		await Promise.all(recipients.map((member) => createNotification({
			recipient: member._id,
			type: "file-shared",
			title: "File shared with your team",
			message: `${req.fileRecord.originalName} was shared with ${team.name}`,
			data: { fileId: req.fileRecord._id, teamId: team._id }
		})));
		return res.status(201).json({ success: true, data: { teamId: team._id, teamName: team.name, sharedCount: shares.length, skippedCount: members.length - recipients.length } });
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

		const recipientId = share.sharedWith.toString();
		const fileId = share.file._id.toString();
		await share.deleteOne();
		const payload = { shareId: req.params.shareId, fileId };
		getIO().to(`user:${recipientId}`).emit(FILE_SHARE_REVOKED, payload);
		getIO().to(`user:${req.user.id}`).emit(FILE_SHARE_REVOKED, payload);
		await createNotification({
			recipient: recipientId,
			type: "file-share-revoked",
			title: "File share revoked",
			message: "A shared file is no longer available to you",
			data: { shareId: req.params.shareId, fileId }
		});
		return res.json({ success: true, message: "File share revoked" });
	} catch (error) {
		next(error);
	}
};

module.exports = { shareFile, shareFileWithAdmins, shareFileWithTeam, listReceivedShares, listSentShares, revokeShare };
