const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
	{
		recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		type: {
			type: String,
			enum: ["file-uploaded", "file-deleted", "file-shared", "file-share-revoked"],
			required: true
		},
		title: { type: String, required: true, trim: true, maxlength: 160 },
		message: { type: String, required: true, trim: true, maxlength: 500 },
		data: { type: mongoose.Schema.Types.Mixed, default: {} },
		readAt: { type: Date, default: null, index: true }
	},
	{ timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
