const mongoose = require("mongoose");
const User = require("../schema/User");
const Order = require("../schema/Order");
const Team = require("../schema/Team");
const { hashPassword } = require("../utils/password");
const { normalizeWhatsappNumber } = require("../utils/whatsapp");

const createUser = async (req, res, next) => {
	try {
		const { name, email, username, password, role, whatsappNumber } = req.body;
		if (role === "designer") {
			const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";

			if (normalizedUsername.length < 2 || normalizedUsername.length > 50 || typeof password !== "string") {
				return res.status(400).json({
					success: false,
					message: "Username must be between 2 and 50 characters and password is required"
				});
			}

			if (password.length < 6) {
				return res.status(400).json({
					success: false,
					message: "Password must be at least 6 characters"
				});
			}

			const existingIdentity = await User.findOne({
				$or: [{ username: normalizedUsername }, { email: normalizedUsername }]
			});
			if (existingIdentity) {
				return res.status(409).json({
					success: false,
					message: "An account with this username already exists"
				});
			}

			const user = await User.create({
				name: normalizedUsername,
				username: normalizedUsername,
				password: await hashPassword(password),
				role: "designer"
			});
			const responseUser = user.toObject();
			delete responseUser.password;

			return res.status(201).json({ success: true, data: responseUser });
		}

		const normalizedName = typeof name === "string" ? name.trim() : "";
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
		const normalizedWhatsappNumber = typeof whatsappNumber === "string" ? normalizeWhatsappNumber(whatsappNumber) : null;

		if (typeof whatsappNumber === "string" && !normalizedWhatsappNumber) {
			return res.status(400).json({
				success: false,
				message: "WhatsApp number must contain 8 to 15 digits"
			});
		}

		if (!normalizedName || !normalizedEmail || typeof password !== "string") {
			return res.status(400).json({
				success: false,
				message: "Name, email, and password are required"
			});
		}

		if (normalizedName.length < 2 || normalizedName.length > 100) {
			return res.status(400).json({
				success: false,
				message: "Name must be between 2 and 100 characters"
			});
		}

		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: "Password must be at least 6 characters"
			});
		}

		const existingUser = await User.findOne({
			$or: [{ email: normalizedEmail }, { username: normalizedEmail }]
		});

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: "An account with this email or username already exists"
			});
		}

		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			whatsappNumber: normalizedWhatsappNumber,
			password: await hashPassword(password),
			role: role === "admin" ? "admin" : "user"
		});

		const responseUser = user.toObject();
		delete responseUser.password;

		return res.status(201).json({
			success: true,
			data: responseUser
		});
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({
				success: false,
				message: "An account with this email or username already exists"
			});
		}

		next(error);
	}
};

const getCurrentUser = async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id || req.user._id).select("-password");

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}

		return res.json({
			success: true,
			data: user
		});
	} catch (error) {
		next(error);
	}
};

const listUsers = async (req, res, next) => {
	try {
		const filter = { isActive: true };
		if (req.query.role) filter.role = req.query.role;

		const users = await User.find(filter)
			.select("name username email whatsappNumber role isActive lastSeen createdAt")
			.sort({ name: 1 });

		return res.json({
			success: true,
			count: users.length,
			data: users
		});
	} catch (error) {
		next(error);
	}
};

const listDesigners = async (req, res, next) => {
	try {
		const includeInactive = req.query.includeInactive === "true" && req.user.role === "admin";
		const filter = { role: "designer", ...(includeInactive ? {} : { isActive: true }) };
		const designers = await User.find(filter)
			.select("name username email whatsappNumber role isActive lastSeen createdAt")
			.sort({ name: 1 });

		return res.json({
			success: true,
			count: designers.length,
			data: designers
		});
	} catch (error) {
		next(error);
	}
};

const setDesignerStatus = async (req, res, next) => {
	try {
		if (typeof req.body.isActive !== "boolean") {
			return res.status(400).json({ success: false, message: "isActive must be a boolean" });
		}
		const designer = await User.findOne({ _id: req.params.designerId, role: "designer" });
		if (!designer) return res.status(404).json({ success: false, message: "Designer not found" });

		designer.isActive = req.body.isActive;
		await designer.save();
		return res.json({ success: true, data: { _id: designer._id, isActive: designer.isActive } });
	} catch (error) {
		next(error);
	}
};

const getUser = (req, res) => {
	return res.json({
		success: true,
		data: req.targetUser
	});
};

const updateUser = async (req, res, next) => {
	try {
		const updates = {};

		if (typeof req.body.name === "string") {
			const name = req.body.name.trim();

			if (name.length < 2 || name.length > 100) {
				return res.status(400).json({
					success: false,
					message: "Name must be between 2 and 100 characters"
				});
			}

			updates.name = name;
		}

		if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
			if (req.body.email === null || req.body.email === "") {
				updates.email = null;
			} else if (typeof req.body.email !== "string") {
				return res.status(400).json({
					success: false,
					message: "Email must be a valid email address"
				});
			} else {
				const email = req.body.email.trim().toLowerCase();
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
					return res.status(400).json({
						success: false,
						message: "Email must be a valid email address"
					});
				}

				const existingIdentity = await User.findOne({
					_id: { $ne: req.targetUser._id },
					$or: [{ email }, { username: email }]
				});
				if (existingIdentity) {
					return res.status(409).json({
						success: false,
						message: "An account with this email or username already exists"
					});
				}

				updates.email = email;
			}
		}

		if (typeof req.body.whatsappNumber === "string") {
			const whatsappNumber = normalizeWhatsappNumber(req.body.whatsappNumber);
			if (!whatsappNumber) {
				return res.status(400).json({
					success: false,
					message: "WhatsApp number must contain 8 to 15 digits"
				});
			}
			updates.whatsappNumber = whatsappNumber;
		}

		if (req.body.whatsappNumber === null) {
			updates.whatsappNumber = null;
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({
				success: false,
				message: "No supported fields were provided"
			});
		}

		Object.assign(req.targetUser, updates);
		await req.targetUser.save();

		return res.json({
			success: true,
			data: req.targetUser
		});
	} catch (error) {
		next(error);
	}
};

const deleteDesigner = async (req, res, next) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.designerId)) {
			return res.status(400).json({ success: false, message: "A valid designerId is required" });
		}

		const designer = await User.findOne({ _id: req.params.designerId, role: "designer" });
		if (!designer) {
			return res.status(404).json({ success: false, message: "Designer not found" });
		}

		await Order.updateMany({ assignedDesigner: designer._id }, { $set: { assignedDesigner: null } });
		await Team.updateMany({ members: designer._id }, { $pull: { members: designer._id } });
		await Team.updateMany(
			{ owner: designer._id },
			{ $set: { owner: req.user.id }, $addToSet: { members: req.user.id } }
		);
		await designer.deleteOne();
		return res.json({ success: true, data: { _id: designer._id } });
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createUser,
	getCurrentUser,
	listUsers,
	listDesigners,
	getUser,
	updateUser,
	deleteDesigner,
	setDesignerStatus
};
