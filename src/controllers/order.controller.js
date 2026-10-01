const mongoose = require("mongoose");
const Order = require("../schema/Order");
const User = require("../schema/User");
const File = require("../schema/File");
const { getIO } = require("../config/socket");
const { ORDER_UPDATED } = require("../constants/events");

const orderPopulate = [
	{ path: "assignedDesigner", select: "name email" },
	{ path: "sourceFiles.file", select: "originalName" }
];

const emitOrderUpdated = (order, action) => {
	const io = getIO();
	const userIds = [order.createdBy, order.customerUser, order.assignedDesigner]
		.map((user) => user?._id || user)
		.filter(Boolean)
		.map((userId) => userId.toString());
	const payload = { orderNumber: order.orderNumber, action };
	io.to("admin").emit(ORDER_UPDATED, payload);
	for (const userId of new Set(userIds)) io.to(`user:${userId}`).emit(ORDER_UPDATED, payload);
};

const listOrders = async (req, res, next) => {
	try {
		let filter = {};
		if (req.user.role === "designer") filter = { assignedDesigner: req.user.id };
		if (req.user.role === "user") {
			const user = await User.findById(req.user.id).select("name");
			filter = { $or: [{ createdBy: req.user.id }, { customerUser: req.user.id }, { customerName: user?.name }] };
		}
		const orders = await Order.find(filter).populate(orderPopulate).sort({ createdAt: -1 });
		return res.json({ success: true, count: orders.length, data: orders });
	} catch (error) {
		next(error);
	}
};

const createOrder = async (req, res, next) => {
	try {
		const orderNumber = String(req.body.orderNumber || req.body.id || "").trim();
		const designName = String(req.body.designName || req.body.name || "").trim();
		const customerName = String(req.body.customerName || req.body.customer || "").trim();
		const format = String(req.body.format || "").trim();
		const priority = ["Low", "Normal", "High", "Urgent"].includes(req.body.priority) ? req.body.priority : "Normal";
		const productionNotes = typeof req.body.productionNotes === "string" ? req.body.productionNotes : typeof req.body.notes === "string" ? req.body.notes : "";
		if (!orderNumber || !designName || !customerName || !format) {
			return res.status(400).json({ success: false, message: "Order number, customer, design name, and format are required" });
		}

		const existing = await Order.findOne({ orderNumber });
		if (existing) {
			if (req.user.role !== "admin" && existing.createdBy.toString() !== req.user.id) {
				return res.status(409).json({ success: false, message: "An order with this number already exists" });
			}
			await existing.populate(orderPopulate);
			return res.json({ success: true, data: existing });
		}

		let customerUser = req.user.role === "user" ? req.user.id : null;
		if (req.user.role === "admin") {
			const customer = await User.findOne({ name: customerName, role: "user", isActive: true }).select("_id");
			customerUser = customer?._id || null;
		}

		const requestedFiles = Array.isArray(req.body.sourceFiles) ? req.body.sourceFiles : [];
		const fileEntries = requestedFiles
			.map((item) => ({ fileId: String(item.fileKey || item.fileId || ""), name: String(item.name || "") }))
			.filter((item) => mongoose.Types.ObjectId.isValid(item.fileId));
		const fileIds = fileEntries.map((item) => item.fileId);
		const ownedFiles = await File.find({ _id: { $in: fileIds }, ...(req.user.role === "admin" ? {} : { owner: req.user.id }) }).select("_id originalName");
		const ownedFileIds = new Set(ownedFiles.map((file) => file._id.toString()));
		const sourceFiles = fileEntries.filter((item) => ownedFileIds.has(item.fileId)).map((item) => ({
			file: item.fileId,
			name: item.name || ownedFiles.find((file) => file._id.toString() === item.fileId)?.originalName || "File"
		}));

		const order = await Order.create({
			orderNumber,
			createdBy: req.user.id,
			customerUser,
			customerName,
			designName,
			format,
			priority,
			status: "Pending",
			notes: productionNotes,
			productionNotes,
			sourceFiles
		});
		await order.populate(orderPopulate);
		emitOrderUpdated(order, "created");
		return res.status(201).json({ success: true, data: order });
	} catch (error) {
		if (error.code === 11000) {
			const existing = await Order.findOne({ orderNumber: req.body.orderNumber || req.body.id }).populate(orderPopulate);
			if (existing) return res.json({ success: true, data: existing });
		}
		next(error);
	}
};

const assignOrder = async (req, res, next) => {
	try {
		const designer = await User.findOne({ _id: req.body.designerId, role: "designer", isActive: true }).select("_id");
		if (!designer) return res.status(404).json({ success: false, message: "Active designer not found" });
		const order = await Order.findOneAndUpdate(
			{ orderNumber: req.params.orderNumber },
			{ $set: { assignedDesigner: designer._id, status: "In Design" } },
			{ new: true, runValidators: true }
		).populate(orderPopulate);
		if (!order) return res.status(404).json({ success: false, message: "Order not found" });
		emitOrderUpdated(order, "assigned");
		return res.json({ success: true, data: order });
	} catch (error) {
		next(error);
	}
};

const updateOrder = async (req, res, next) => {
	try {
		const status = req.body.status;
		if (!["Pending", "In Design", "Ready for Review", "Completed"].includes(status)) {
			return res.status(400).json({ success: false, message: "A valid order status is required" });
		}
		const filter = { orderNumber: req.params.orderNumber };
		if (req.user.role === "designer") filter.assignedDesigner = req.user.id;
		const update = { status };
		if (req.user.role === "admin" && typeof req.body.sentToCustomer === "string") update.sentToCustomer = req.body.sentToCustomer;
		const order = await Order.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true }).populate(orderPopulate);
		if (!order) return res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
		emitOrderUpdated(order, "updated");
		return res.json({ success: true, data: order });
	} catch (error) {
		next(error);
	}
};

const deleteOrder = async (req, res, next) => {
	try {
		const order = await Order.findOneAndDelete({ orderNumber: req.params.orderNumber });
		if (!order) return res.status(404).json({ success: false, message: "Order not found" });
		emitOrderUpdated(order, "deleted");
		return res.json({ success: true, data: { orderNumber: order.orderNumber } });
	} catch (error) {
		next(error);
	}
};

module.exports = { listOrders, createOrder, assignOrder, updateOrder, deleteOrder };