const User = require("../schema/User");
const { comparePassword, hashPassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

const createTestAdmin = async (req, res, next) => {
	try {
		if (process.env.NODE_ENV === "production") {
			return res.status(404).json({ success: false, message: "Not found" });
		}

		if (process.env.TEST_ADMIN_KEY && req.headers["x-test-admin-key"] !== process.env.TEST_ADMIN_KEY) {
			return res.status(401).json({ success: false, message: "Invalid test admin key" });
		}

		const { name, email, password } = req.body;
		const normalizedName = typeof name === "string" ? name.trim() : "";
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

		if (!normalizedName || !normalizedEmail || typeof password !== "string") {
			return res.status(400).json({
				success: false,
				message: "Name, email, and password are required"
			});
		}

		if (normalizedName.length < 2 || normalizedName.length > 100 || password.length < 6) {
			return res.status(400).json({
				success: false,
				message: "Name must be 2-100 characters and password must be at least 6 characters"
			});
		}

		const existingUser = await User.findOne({ email: normalizedEmail });
		if (existingUser) {
			return res.status(409).json({ success: false, message: "A user with this email already exists" });
		}

		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			password: await hashPassword(password),
			role: "admin"
		});
		const token = generateToken({ id: user._id.toString(), role: user.role });
		const responseUser = user.toObject();
		delete responseUser.password;

		return res.status(201).json({ success: true, token, data: responseUser });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: "A user with this email already exists" });
		}

		next(error);
	}
};

const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

		if (!normalizedEmail || typeof password !== "string" || !password) {
			return res.status(400).json({
				success: false,
				message: "Email and password are required"
			});
		}

		const user = await User.findOne({ email: normalizedEmail }).select("+password");

		if (!user || !(await comparePassword(password, user.password))) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password"
			});
		}

		if (!user.isActive) {
			return res.status(403).json({
				success: false,
				message: "This account is inactive"
			});
		}

		user.lastSeen = new Date();
		await user.save();

		const token = generateToken({
			id: user._id.toString(),
			role: user.role
		});
		const responseUser = user.toObject();
		delete responseUser.password;

		return res.json({
			success: true,
			token,
			data: responseUser
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createTestAdmin,
	login
};
