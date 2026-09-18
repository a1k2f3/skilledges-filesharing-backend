const express = require("express");
const { createTestAdmin, login } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route is working"
  });
});

router.post("/login", login);
router.post("/test-admin", createTestAdmin);

module.exports = router;