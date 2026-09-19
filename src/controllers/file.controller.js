const File = require("../schema/File");
const FileShare = require("../schema/FileShare");
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
				size: file.size
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
		const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
		return res.json({ success: true, count: files.length, data: files });
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

module.exports = { uploadFile, listFiles, deleteFile };
