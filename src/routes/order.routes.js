const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { listOrders, listDesignerDeliveryReport, createOrder, assignOrder, updateOrder, attachOrderDeliverables, deleteOrder } = require("../controllers/order.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listOrders);
router.get("/reports/designer-deliveries", requireRole("admin"), listDesignerDeliveryReport);
router.post("/", requireRole("admin", "user"), createOrder);
router.patch("/:orderNumber/assignment", requireRole("admin"), assignOrder);
router.post("/:orderNumber/source-files/:sourceFileId/deliverables", requireRole("designer"), attachOrderDeliverables);
router.patch("/:orderNumber", requireRole("admin", "designer"), updateOrder);
router.delete("/:orderNumber", requireRole("admin"), deleteOrder);

module.exports = router;