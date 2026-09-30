const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { listOrders, createOrder, assignOrder, updateOrder, deleteOrder } = require("../controllers/order.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listOrders);
router.post("/", requireRole("admin", "user"), createOrder);
router.patch("/:orderNumber/assignment", requireRole("admin"), assignOrder);
router.patch("/:orderNumber", requireRole("admin", "designer"), updateOrder);
router.delete("/:orderNumber", requireRole("admin"), deleteOrder);

module.exports = router;