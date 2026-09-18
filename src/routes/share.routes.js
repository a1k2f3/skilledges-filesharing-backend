const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { loadFile, requireFileOwner } = require("../middleware/file.middleware");
const { shareFile, listReceivedShares, revokeShare } = require("../controllers/share.controller");

const router = express.Router();

router.use(authenticate);
router.post("/files/:fileId", loadFile, requireFileOwner, shareFile);
router.get("/received", listReceivedShares);
router.delete("/:shareId", revokeShare);

module.exports = router;
