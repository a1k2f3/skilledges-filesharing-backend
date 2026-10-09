const User = require("../schema/User");
const { comparePassword, hashPassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { normalizeWhatsappNumber } = require("../utils/whatsapp");

const createTestAdmin = async (req, res, next) => {
	try {
		if (process.env.NODE_ENV === "production") {
			return res.status(404).json({ success: false, message: "Not found" });
		}

		if (process.env.TEST_ADMIN_KEY && req.headers["x-test-admin-key"] !== process.env.TEST_ADMIN_KEY) {
			return res.status(401).json({ success: false, message: "Invalid test admin key" });
		}

		const { name, email, password, whatsappNumber } = req.body;
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

		if (normalizedName.length < 2 || normalizedName.length > 100 || password.length < 6) {
			return res.status(400).json({
				success: false,
				message: "Name must be 2-100 characters and password must be at least 6 characters"
			});
		}

		const existingUser = await User.findOne({
			$or: [{ email: normalizedEmail }, { username: normalizedEmail }]
		});
		if (existingUser) {
			return res.status(409).json({ success: false, message: "An account with this email or username already exists" });
		}

		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			whatsappNumber: normalizedWhatsappNumber,
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
		const { email, username, identifier, password } = req.body;
		const loginIdentifier = identifier ?? email ?? username;
		const normalizedIdentifier = typeof loginIdentifier === "string" ? loginIdentifier.trim().toLowerCase() : "";

		if (!normalizedIdentifier || typeof password !== "string" || !password) {
			return res.status(400).json({
				success: false,
				message: "Username or email and password are required"
			});
		}

		const user = await User.findOne({
			$or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
		}).select("+password");

		if (!user || !(await comparePassword(password, user.password))) {
			return res.status(401).json({
				success: false,
				message: "Invalid username or email, or password"
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

const signup = async (req, res, next) => {
	try {
		const { name, email, password, whatsappNumber } = req.body;
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

		if (normalizedName.length < 2 || normalizedName.length > 100 || password.length < 6) {
			return res.status(400).json({
				success: false,
				message: "Name must be 2-100 characters and password must be at least 6 characters"
			});
		}

		if (await User.findOne({
			$or: [{ email: normalizedEmail }, { username: normalizedEmail }]
		})) {
			return res.status(409).json({ success: false, message: "An account with this email or username already exists" });
		}

		const isFirstUser = (await User.countDocuments()) === 0;
		const user = await User.create({
			name: normalizedName,
			email: normalizedEmail,
			whatsappNumber: normalizedWhatsappNumber,
			password: await hashPassword(password),
			role: isFirstUser ? "admin" : "user"
		});
		const token = generateToken({ id: user._id.toString(), role: user.role });
		const responseUser = user.toObject();
		delete responseUser.password;

		return res.status(201).json({ success: true, token, data: responseUser });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ success: false, message: "An account with this email or username already exists" });
		}

		next(error);
	}
};

module.exports = {
	createTestAdmin,
	login,
	signup
};
