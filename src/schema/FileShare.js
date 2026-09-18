const mongoose = require("mongoose");

const fileShareSchema = new mongoose.Schema(
	{
		file: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true, index: true },
		sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		permission: { type: String, enum: ["view", "edit"], default: "view" },
		expiresAt: { type: Date, default: null }
	},
	{ timestamps: true }
);

fileShareSchema.index({ file: 1, sharedWith: 1 }, { unique: true });

module.exports = mongoose.model("FileShare", fileShareSchema);
