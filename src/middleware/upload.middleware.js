const multer = require("multer");

const allowedExtensions = new Set([
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "svg",
	"pdf", "dst", "emb", "exp", "pes", "jef", "vp3", "xxx", "hus", "ngs"
]);

const fileFilter = (req, file, callback) => {
	const extension = file.originalname.split(".").pop().toLowerCase();

	if (!extension || !allowedExtensions.has(extension)) {
		return callback(new Error("Unsupported file type"));
	}

	callback(null, true);
};

module.exports = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024) },
	fileFilter
});
