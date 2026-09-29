const { verifyToken } = require("../utils/jwt");
const User = require("../schema/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("isActive");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "This account is inactive"
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

module.exports = authenticate;