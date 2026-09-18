const User = require("../schema/User");
const { comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

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
	login
};
