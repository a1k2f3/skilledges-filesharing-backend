const User = require("../schema/User");
const { hashPassword } = require("../utils/password");

const createUser = async (req, res, next) => {
	try {
		const { name, email, password, role } = req.body;
		const normalizedName = typeof name === "string" ? name.trim() : "";
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

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

		const existingUser = await User.findOne({ email: normalizedEmail });

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: "A user with this email already exists"
			});
		}

		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
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
				message: "A user with this email already exists"
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
		const users = await User.find({ isActive: true })
			.select("name email role lastSeen createdAt")
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

			if (!name) {
				return res.status(400).json({
					success: false,
					message: "Name cannot be empty"
				});
			}

			updates.name = name;
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

module.exports = {
	createUser,
	getCurrentUser,
	listUsers,
	getUser,
	updateUser
};
