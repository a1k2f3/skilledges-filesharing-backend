const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
	{
		orderNumber: { type: String, required: true, unique: true, trim: true },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		customerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
		customerName: { type: String, required: true, trim: true },
		assignedDesigner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
		designName: { type: String, required: true, trim: true },
		format: { type: String, required: true, trim: true },
		status: { type: String, enum: ["Pending", "In Design", "Ready for Review", "Completed"], default: "Pending" },
		notes: { type: String, default: "" },
		sourceFiles: [{ file: { type: mongoose.Schema.Types.ObjectId, ref: "File" }, name: String }],
		sentToCustomer: { type: String, default: "" }
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);