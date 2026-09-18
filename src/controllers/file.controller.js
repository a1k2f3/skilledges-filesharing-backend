const File = require("../schema/File");
const FileShare = require("../schema/FileShare");
const { cloudinary, uploadBuffer, getResourceType } = require("../config/cloudinary");

const uploadFile = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: "A file is required" });
		}

		const uploaded = await uploadBuffer(req.file.buffer, {
			resource_type: getResourceType(req.file.originalname),
			public_id: `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9_-]/g, "-")}`
		});
		const file = await File.create({
			owner: req.user.id,
			originalName: req.file.originalname,
			publicId: uploaded.public_id,
			secureUrl: uploaded.secure_url,
			resourceType: uploaded.resource_type,
			format: uploaded.format || null,
			mimeType: req.file.mimetype,
			size: req.file.size
		});

		return res.status(201).json({ success: true, data: file });
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

		return res.json({ success: true, message: "File deleted successfully" });
	} catch (error) {
		next(error);
	}
};

module.exports = { uploadFile, listFiles, deleteFile };
