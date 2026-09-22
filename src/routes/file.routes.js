const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { loadFile, requireFileOwner } = require("../middleware/file.middleware");
const { uploadFile, listFiles, downloadFile, deleteFile } = require("../controllers/file.controller");

const router = express.Router();

router.use(authenticate);
router.post("/upload", upload.array("file"), uploadFile);
router.get("/", listFiles);
router.get("/:fileId/download", loadFile, downloadFile);
router.delete("/:fileId", loadFile, requireFileOwner, deleteFile);

module.exports = router;
