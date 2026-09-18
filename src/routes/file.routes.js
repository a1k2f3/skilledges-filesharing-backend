const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { loadFile, requireFileOwner } = require("../middleware/file.middleware");
const { uploadFile, listFiles, deleteFile } = require("../controllers/file.controller");

const router = express.Router();

router.use(authenticate);
router.post("/upload", upload.single("file"), uploadFile);
router.get("/", listFiles);
router.delete("/:fileId", loadFile, requireFileOwner, deleteFile);

module.exports = router;
