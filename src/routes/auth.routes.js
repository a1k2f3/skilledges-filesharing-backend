const express = require("express");
const { login } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route is working"
  });
});

router.post("/login", login);

module.exports = router;