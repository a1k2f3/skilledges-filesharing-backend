const mongoose = require("mongoose");
const File = require("../schema/File");
const FileShare = require("../schema/FileShare");
const User = require("../schema/User");
const { Readable } = require("stream");
const sharp = require("sharp");
const { cloudinary, uploadBuffer, getResourceType } = require("../config/cloudinary");
const { getIO } = require("../config/socket");
const { FILE_UPLOADED, FILE_DELETED } = require("../constants/events");
const { createNotification } = require("./notification.controller");

const uploadFile = async (req, res, next) => {
	try {
		if (!req.files?.length) {
			return res.status(400).json({ success: false, message: "At least one file is required" });
		}

		const files = await Promise.all(req.files.map(async (file) => {
			const imageMetadata = file.mimetype.startsWith("image/")
				? await sharp(file.buffer).metadata().catch(() => null)
				: null;
			const resolutionDpi = imageMetadata
				? Number.isFinite(imageMetadata.density) && imageMetadata.density > 0 ? imageMetadata.density : 96
				: undefined;
			const widthInches = imageMetadata?.width && resolutionDpi
				? Math.round((imageMetadata.width / resolutionDpi) * 100) / 100
				: undefined;
			const heightInches = imageMetadata?.height && resolutionDpi
				? Math.round((imageMetadata.height / resolutionDpi) * 100) / 100
				: undefined;
			const uploaded = await uploadBuffer(file.buffer, {
				resource_type: getResourceType(file.originalname),
				public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-")}`
			});
			return File.create({
				owner: req.user.id,
				originalName: file.originalname,
				publicId: uploaded.public_id,
				secureUrl: uploaded.secure_url,
				resourceType: uploaded.resource_type,
				format: uploaded.format || null,
				mimeType: file.mimetype,
				size: file.size,
				widthInches,
				heightInches,
				resolutionDpi
			});
		}));

		const payload = { count: files.length, files };
		await createNotification({
			recipient: req.user.id,
			type: "file-uploaded",
			title: "Files uploaded",
			message: `${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully`,
			data: { fileIds: files.map((file) => file._id) }
		});
		getIO().to(`user:${req.user.id}`).emit(FILE_UPLOADED, payload);
		getIO().to("admin").emit(FILE_UPLOADED, { ...payload, ownerId: req.user.id });

		return res.status(201).json({ success: true, ...payload, data: files });
	} catch (error) {
		next(error);
	}
};

const listFiles = async (req, res, next) => {
	try {
		const files = await File.find(req.user.role === "admin" ? {} : { owner: req.user.id })
			.populate("owner", "name username email role")
			.sort({ createdAt: -1 });
		return res.json({ success: true, count: files.length, data: files });
	} catch (error) {
		next(error);
	}
};

const downloadFile = async (req, res, next) => {
	try {
		const isOwner = req.fileRecord.owner.toString() === req.user.id;
		const isAdmin = req.user.role === "admin";
		const hasShare = await FileShare.exists({
			file: req.fileRecord._id,
			sharedWith: req.user.id,
			$or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
		});
		if (!isOwner && !isAdmin && !hasShare) {
			return res.status(403).json({ success: false, message: "You do not have access to this file" });
		}

		const upstream = await fetch(req.fileRecord.secureUrl);
		if (!upstream.ok || !upstream.body) {
			return res.status(502).json({ success: false, message: "Unable to retrieve file from storage" });
		}

		const fallbackName = req.fileRecord.originalName.replace(/[\r\n"\\]/g, "_");
		res.setHeader("Content-Type", req.fileRecord.mimeType || upstream.headers.get("content-type") || "application/octet-stream");
		res.setHeader("Content-Disposition", `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(req.fileRecord.originalName)}`);
		if (upstream.headers.get("content-length")) res.setHeader("Content-Length", upstream.headers.get("content-length"));
		return Readable.fromWeb(upstream.body).pipe(res);
	} catch (error) {
		next(error);
	}
};

const deleteFile = async (req, res, next) => {
	try {
		await cloudinary.uploader.destroy(req.fileRecord.publicId, {
			resource_type: req.fileRecord.resourceType
		});
		await FileShare.deleteMany({ file: req.fileRecord._id });
		await req.fileRecord.deleteOne();
		await createNotification({
			recipient: req.user.id,
			type: "file-deleted",
			title: "File deleted",
			message: `${req.fileRecord.originalName} was deleted`,
			data: { fileId: req.fileRecord._id }
		});
		getIO().to(`user:${req.user.id}`).emit(FILE_DELETED, { fileId: req.fileRecord._id.toString() });
		getIO().to("admin").emit(FILE_DELETED, { fileId: req.fileRecord._id.toString(), ownerId: req.user.id });

		return res.json({ success: true, message: "File deleted successfully" });
	} catch (error) {
		next(error);
	}
};

const deleteFilesBulk = async (req, res, next) => {
	try {
		const deleteAll = req.body.deleteAll === true;
		const fileIds = req.body.fileIds;
		const ownerId = req.body.ownerId;
		if (!mongoose.isValidObjectId(ownerId)) {
			return res.status(400).json({ success: false, message: "A valid ownerId is required" });
		}
		const owner = await User.findById(ownerId).select("_id");
		if (!owner) {
			return res.status(404).json({ success: false, message: "User not found" });
		}
		if (!deleteAll && (!Array.isArray(fileIds) || fileIds.length === 0)) {
			return res.status(400).json({ success: false, message: "Choose files to delete or confirm deleting all files" });
		}
		if (!deleteAll && fileIds.some((id) => !mongoose.isValidObjectId(id))) {
			return res.status(400).json({ success: false, message: "All fileIds must be valid file ids" });
		}

		const uniqueFileIds = [...new Set(fileIds || [])];
		const filter = deleteAll
			? { owner: owner._id }
			: { owner: owner._id, _id: { $in: uniqueFileIds } };
		const files = await File.find(filter);
		if (!deleteAll && files.length !== uniqueFileIds.length) {
			return res.status(403).json({ success: false, message: "One or more selected files do not belong to this user" });
		}
		const deletedIds = [];
		let failedCount = 0;
		for (const file of files) {
			try {
				await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType });
				deletedIds.push(file._id);
			} catch {
				failedCount += 1;
			}
		}

		if (deletedIds.length) {
			const affectedShares = await FileShare.find({ file: { $in: deletedIds } }).select("file sharedWith");
			const recipientsByFile = new Map();
			for (const share of affectedShares) {
				const fileId = share.file.toString();
				const recipients = recipientsByFile.get(fileId) || [];
				recipients.push(share.sharedWith);
				recipientsByFile.set(fileId, recipients);
			}
			await FileShare.deleteMany({ file: { $in: deletedIds } });
			await File.deleteMany({ _id: { $in: deletedIds } });
			for (const file of files.filter((item) => deletedIds.some((id) => id.equals(item._id)))) {
				const payload = { fileId: file._id.toString(), ownerId: owner._id.toString() };
				getIO().to(`user:${owner._id}`).emit(FILE_DELETED, payload);
				getIO().to("admin").emit(FILE_DELETED, payload);
				for (const recipientId of recipientsByFile.get(file._id.toString()) || []) {
					getIO().to(`user:${recipientId}`).emit(FILE_DELETED, payload);
				}
			}
		}

		return res.json({ success: true, data: { deletedCount: deletedIds.length, failedCount } });
	} catch (error) {
		next(error);
	}
};

module.exports = { uploadFile, listFiles, downloadFile, deleteFile, deleteFilesBulk };
