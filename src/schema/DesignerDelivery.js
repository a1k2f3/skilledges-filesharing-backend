const mongoose = require("mongoose");

const designerDeliverySchema = new mongoose.Schema(
	{
		designer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		designerName: { type: String, required: true },
		orderNumber: { type: String, required: true },
		designName: { type: String, required: true },
		sourceFileName: { type: String, default: "" },
		fileName: { type: String, required: true },
		deliverableFileId: { type: String, required: true },
		receivedAt: { type: Date, required: true, default: Date.now }
	},
	{ timestamps: true }
);

designerDeliverySchema.index({ orderNumber: 1, deliverableFileId: 1 }, { unique: true });
designerDeliverySchema.index({ receivedAt: 1, designer: 1 });

module.exports = mongoose.model("DesignerDelivery", designerDeliverySchema);