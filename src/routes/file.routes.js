const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
const { loadFile, requireFileOwner } = require("../middleware/file.middleware");
const { uploadFile, listFiles, downloadFile, deleteFile, deleteFilesBulk } = require("../controllers/file.controller");

const router = express.Router();

router.use(authenticate);
router.post("/upload", upload.array("file"), uploadFile);
router.post("/admin/bulk-delete", requireRole("admin"), deleteFilesBulk);
router.get("/", listFiles);
router.get("/:fileId/download", loadFile, downloadFile);
router.delete("/:fileId", loadFile, requireFileOwner, deleteFile);

module.exports = router;
