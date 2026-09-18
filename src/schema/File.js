const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
	{
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true
		},
		originalName: { type: String, required: true, trim: true, maxlength: 255 },
		publicId: { type: String, required: true, unique: true },
		secureUrl: { type: String, required: true },
		resourceType: { type: String, required: true },
		format: { type: String, default: null },
		mimeType: { type: String, required: true },
		size: { type: Number, required: true }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);
